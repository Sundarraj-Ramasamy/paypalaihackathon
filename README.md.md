# Smart Invoice Generator ⚡️💳

**Submission for the "Build What's Next with PayPal and AI" Hackathon**

Smart Invoice Generator is an AI-powered billing assistant that eliminates administrative friction for freelancers and builders. By transforming messy, unstructured natural language (like voice notes, meeting summaries, or chaotic emails) into a strict JSON schema, it automatically drafts and sends professional invoices using the PayPal Invoicing API.

## 🚀 Features

* **Zero-Friction Input:** Type or paste unstructured text describing a billing scenario.
* **AI Data Extraction:** Utilizes LLMs to parse client details, line items, quantities, and rates.
* **Automated Invoicing:** Orchestrates with the PayPal Invoicing API to instantly generate a draft invoice.
* **Instant Delivery:** Automatically emails the finalized invoice to the client for immediate payment.

## 🛠 Tech Stack

* **Frontend:** React, TypeScript, Vite, Tailwind CSS
* **Backend:** Node.js, Express.js
* **AI Integration:** OpenAI API (JSON Mode) / Anthropic Claude 
* **Payment Integration:** PayPal REST API (OAuth 2.0 & Invoicing API v2)
* **Deployment:** Render

## 💻 Local Setup Instructions

Follow these steps to run the Smart Invoice Generator on your local machine.

### Prerequisites

* Node.js (v18 or higher)
* npm or yarn
* An OpenAI API Key (or applicable LLM provider)
* A PayPal Developer Account

### 1. Configure PayPal Sandbox Credentials

To use the PayPal API, you need a Client ID and Client Secret from the Sandbox environment.

1. Go to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/) and log in.
2. Navigate to **Apps & Credentials**.
3. Ensure the toggle switch at the top is set to **Sandbox** (not Live).
4. Click the **Create App** button.
5. Name your app (e.g., "Smart Invoice Hackathon") and select **Merchant** as the App Type. Click Create.
6. You will now see your **Client ID** and **Client Secret**. Keep this tab open.

### 2. Clone the Repository

```bash
git clone https://github.com/your-username/smart-invoice-generator.git
cd smart-invoice-generator
```

### 3. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the root of the `backend` directory and add your keys:

```env
PORT=5000
OPENAI_API_KEY=your_openai_api_key_here
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret_here
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_INVOICER_EMAIL=your_sandbox_merchant_email@example.com
```

`PAYPAL_INVOICER_EMAIL` must be the email for the Sandbox business account associated with your PayPal app. Keep the REST app credentials private and do not commit `.env`.

Start the backend server:

```bash
npm run dev
```

### 4. Frontend Setup

Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The frontend will typically run on `http://localhost:5173/` and securely communicate with your local backend on port 5000.

## 💡 Usage

1. Open the application in your browser.
2. In the text area, type a messy description. Example: 
   *"I just finished a project for Alex. We agreed on 15 hours of React development at $100/hr, plus a flat fee of $300 for the deployment setup. Please send the bill to alex.client@example.com."*
3. Click **Generate & Send Invoice**.
4. The AI will parse the data, and the backend will coordinate with PayPal. 
5. Check the Sandbox buyer email account in your PayPal Developer dashboard to see the delivered invoice!

## 📜 License

This project is licensed under the MIT License.