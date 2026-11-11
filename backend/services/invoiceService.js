import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const INVOICE_SYSTEM_PROMPT = `You are an invoice parsing assistant. The user will provide unstructured text describing a billing scenario. Extract the client information, the currency, and the line items, and output ONLY valid JSON matching the following schema. Do not include markdown formatting or explanations.

Required Mapping Rules:
1. detail.currency_code: Default to "USD" if not specified.
2. primary_recipients[0].billing_info.email_address: Extract the email. If no name is provided, use "Valued" for given_name and "Client" for surname.
3. items: For each line item, extract the name, quantity (as a string), and unit_amount.value (as a string with two decimal places). Set unit_amount.currency_code to match the detail currency.
4. detail.note: Generate a short, professional thank you note summarizing the context of the work.

JSON Schema:
{
  "detail": {
    "currency_code": "USD",
    "note": "Thank you for your business."
  },
  "primary_recipients": [
    {
      "billing_info": {
        "name": {
          "given_name": "Client First Name",
          "surname": "Client Last Name"
        },
        "email_address": "client@example.com"
      }
    }
  ],
  "items": [
    {
      "name": "Service or product name",
      "description": "Optional description",
      "quantity": "10",
      "unit_amount": {
        "currency_code": "USD",
        "value": "150.00"
      }
    }
  ]
}`;

const openAI = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function extractAmount(text) {
  const dollarMatches = [...text.matchAll(/\$\s*(\d+(?:\.\d{1,2})?)/gi)];
  if (dollarMatches.length > 0) {
    return Number(dollarMatches.at(-1)[1]);
  }

  const plainMatches = [...text.matchAll(/(\d+(?:\.\d{1,2})?)\s*(?:usd|dollars?)\b/gi)];
  if (plainMatches.length > 0) {
    return Number(plainMatches.at(-1)[1]);
  }

  return 500;
}

function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : 'client@example.com';
}

function extractCurrency(text) {
  const lower = text.toLowerCase();
  if (lower.includes('eur')) return 'EUR';
  if (lower.includes('gbp')) return 'GBP';
  if (lower.includes('cad')) return 'CAD';
  if (lower.includes('aud')) return 'AUD';
  return 'USD';
}

function extractQuantity(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|hr)/i);
  if (match) return String(Number(match[1]));

  const rateMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:units?|items?)/i);
  return rateMatch ? String(Number(rateMatch[1])) : '1';
}

function extractUnitPrice(text, fallback = 100) {
  const match = text.match(/(?:at|@)\s*\$?\s*(\d+(?:\.\d{1,2})?)(?:\s*\/\s*(?:hr|hour|unit|item))?/i);
  if (match) return Number(match[1]).toFixed(2);

  const flatMatch = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/i);
  if (flatMatch) return Number(flatMatch[1]).toFixed(2);

  return Number(fallback).toFixed(2);
}

function extractFallbackItems(text, currency) {
  const items = [];
  const hourlyMatch = text.match(
    /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s+(?:of\s+)?(.+?)\s+at\s+\$?(\d+(?:\.\d{1,2})?)\s*(?:\/\s*(?:hr|hour)|per\s+hour)/i
  );

  if (hourlyMatch) {
    items.push({
      name: hourlyMatch[2].trim().replace(/\b\w/g, (letter) => letter.toUpperCase()),
      description: 'Hourly professional services.',
      quantity: String(Number(hourlyMatch[1])),
      unit_amount: {
        currency_code: currency,
        value: Number(hourlyMatch[3]).toFixed(2),
      },
    });
  }

  const feeMatch = text.match(/\$\s*(\d+(?:\.\d{1,2})?)\s+([a-z][a-z\s-]*?)\s+fee\b/i);
  if (feeMatch) {
    items.push({
      name: feeMatch[2].trim().replace(/\b\w/g, (letter) => letter.toUpperCase()) + ' Fee',
      description: 'One-time fee.',
      quantity: '1',
      unit_amount: {
        currency_code: currency,
        value: Number(feeMatch[1]).toFixed(2),
      },
    });
  }

  if (items.length) return items;

  return [
    {
      name: 'Consulting Services',
      description: 'Project support and delivery based on the provided brief.',
      quantity: extractQuantity(text),
      unit_amount: {
        currency_code: currency,
        value: extractUnitPrice(text, 150),
      },
    },
  ];
}

function defaultInvoiceData(text) {
  const email = extractEmail(text);
  const currency = extractCurrency(text);
  const firstName = email.split('@')[0]?.replace(/[._-]/g, ' ') || 'Valued';
  const nameParts = firstName.split(' ');

  return {
    detail: {
      currency_code: currency,
      note: 'Thank you for the opportunity to partner on this project.',
    },
    primary_recipients: [
      {
        billing_info: {
          name: {
            given_name: nameParts[0] || 'Valued',
            surname: nameParts.slice(1).join(' ') || 'Client',
          },
          email_address: email,
        },
      },
    ],
    items: extractFallbackItems(text, currency),
  };
}

function normalizeParsedPayload(payload) {
  const safePayload = payload || defaultInvoiceData('');

  safePayload.detail = {
    currency_code: safePayload.detail?.currency_code || 'USD',
    note:
      safePayload.detail?.note || 'Thank you for your business and the opportunity to work together.',
  };

  safePayload.primary_recipients = Array.isArray(safePayload.primary_recipients) && safePayload.primary_recipients.length
    ? safePayload.primary_recipients
    : [
        {
          billing_info: {
            name: { given_name: 'Valued', surname: 'Client' },
            email_address: 'client@example.com',
          },
        },
      ];

  const recipient = safePayload.primary_recipients[0];
  recipient.billing_info = recipient.billing_info || {};
  recipient.billing_info.name = recipient.billing_info.name || { given_name: 'Valued', surname: 'Client' };
  recipient.billing_info.email_address = recipient.billing_info.email_address || 'client@example.com';
  recipient.billing_info.name.given_name = recipient.billing_info.name.given_name || 'Valued';
  recipient.billing_info.name.surname = recipient.billing_info.name.surname || 'Client';

  const normalizedItems = (Array.isArray(safePayload.items) ? safePayload.items : []).map((item) => ({
    name: item?.name || 'Service',
    description: item?.description || 'Professional service delivery.',
    quantity: String(item?.quantity ?? '1'),
    unit_amount: {
      currency_code: item?.unit_amount?.currency_code || safePayload.detail.currency_code || 'USD',
      value: String(item?.unit_amount?.value ?? '0.00'),
    },
  }));

  safePayload.items = normalizedItems.length ? normalizedItems : defaultInvoiceData('').items;

  safePayload.items = safePayload.items.map((item) => ({
    ...item,
    quantity: String(item.quantity ?? '1'),
    unit_amount: {
      ...item.unit_amount,
      value: Number(item.unit_amount.value || 0).toFixed(2),
    },
  }));

  return safePayload;
}

export async function parseInvoiceRequest(text) {
  if (!openAI) {
    return defaultInvoiceData(text);
  }

  const completion = await openAI.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: INVOICE_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No invoice data returned from OpenAI.');
  }

  try {
    const parsed = JSON.parse(content);
    return normalizeParsedPayload(parsed);
  } catch (error) {
    console.warn('OpenAI JSON parse failed, falling back to mock parsing.', error);
    return defaultInvoiceData(text);
  }
}

function buildPayPalInvoicePayload(parsedInvoice) {
  const currencyCode = parsedInvoice.detail.currency_code || 'USD';

  const payload = {
    detail: {
      invoice_date: new Date().toISOString().slice(0, 10),
      currency_code: currencyCode,
      note: parsedInvoice.detail.note || 'Thank you for your business.',
      term: 'Due on receipt',
    },
    invoicer: {
      name: {
        given_name: 'Smart',
        surname: 'Invoice',
      },
      email_address: process.env.PAYPAL_INVOICER_EMAIL || 'billing@smartinvoice.app',
      website: 'https://smartinvoice.app',
    },
    primary_recipients: parsedInvoice.primary_recipients.map((recipient) => ({
      billing_info: {
        name: {
          given_name: recipient.billing_info?.name?.given_name || 'Valued',
          surname: recipient.billing_info?.name?.surname || 'Client',
        },
        email_address: recipient.billing_info?.email_address || 'client@example.com',
      },
    })),
    items: parsedInvoice.items.map((item) => ({
      name: item.name,
      description: item.description || 'Professional service',
      quantity: String(item.quantity || '1'),
      unit_amount: {
        currency_code: currencyCode,
        value: Number(item.unit_amount?.value || 0).toFixed(2),
      },
    })),
  };

  return payload;
}

function getPayPalBaseUrl() {
  return process.env.PAYPAL_ENVIRONMENT === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { access_token: 'mocked-access-token', mocked: true };
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal auth failed: ${errorText}`);
  }

  const data = await response.json();
  return { access_token: data.access_token, mocked: false };
}

async function createPayPalInvoice(invoiceData, accessToken) {
  if (accessToken.mocked) {
    return {
      id: 'MOCK-INVOICE-001',
      status: 'DRAFT',
      mocked: true,
      invoice: invoiceData,
      send_url: 'https://developer.paypal.com/dashboard/',
    };
  }

  const response = await fetch(`${getPayPalBaseUrl()}/v2/invoicing/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken.access_token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(invoiceData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal invoice creation failed: ${errorText}`);
  }

  const invoice = await response.json().catch(() => null);
  const location = response.headers.get('location') || invoice?.href || invoice?.self?.href || null;
  const invoiceId = location ? location.split('/').pop() : 'UNKNOWN';

  const sendResponse = await fetch(`${getPayPalBaseUrl()}/v2/invoicing/invoices/${invoiceId}/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: '{}',
  });

  if (!sendResponse.ok) {
    const errorText = await sendResponse.text();
    return {
      id: invoiceId,
      status: 'DRAFT',
      mocked: false,
      invoice,
      sent: false,
      send_error: errorText,
    };
  }

  const sendResult = await sendResponse.json().catch(() => ({ status: 'SENT' }));
  return {
    id: invoiceId,
    status: 'SENT',
    mocked: false,
    invoice: invoice || sendResult,
    sent: true,
  };
}

export async function createInvoiceFromText(text) {
  const parsedInvoice = await parseInvoiceRequest(text);
  const accessToken = await getPayPalAccessToken();
  const paypalPayload = buildPayPalInvoicePayload(parsedInvoice);
  const invoiceResult = await createPayPalInvoice(paypalPayload, accessToken);

  const invoiceWasSent = invoiceResult.sent === true;
  const userEmailIssue = invoiceResult.send_error && /USER_NOT_FOUND|invoicer email/i.test(invoiceResult.send_error);

  return {
    success: true,
    mocked: invoiceResult.mocked || false,
    parsedInvoice,
    invoice: invoiceResult,
    message: invoiceResult.mocked
      ? 'Invoice parsed successfully. API credentials are not configured, so the invoice remains in mock mode.'
      : invoiceWasSent
        ? 'Invoice drafted and sent via PayPal Sandbox successfully.'
        : userEmailIssue
          ? 'Invoice draft was created successfully, but it could not be sent because PAYPAL_INVOICER_EMAIL is not associated with a valid PayPal Sandbox merchant account.'
          : 'Invoice was created in PayPal Sandbox, but sending failed. Review the PayPal API response for details.',
  };
}
