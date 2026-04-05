# ARTIKA.life Backend (Healthcare AI Chat + OCR Prescription)

Production-ready Node.js backend with:
- Chat endpoint with memory and severity classification
- OCR-based prescription extraction from image or PDF
- WhatsApp webhook ingestion (Twilio and Meta Cloud style payloads)
- Local LLM integration via Ollama
- MongoDB persistence for chat and structured prescriptions

## 1) Updated Project Structure

backend/
- server.js
- routes/
  - chat.routes.js
  - upload.routes.js
- controllers/
  - chat.controller.js
  - upload.controller.js
- services/
  - llm.service.js
  - memory.service.js
  - ocr.service.js
- models/
  - chat.model.js
  - user.model.js
  - prescription.model.js
- utils/
  - promptBuilder.js
- config/
  - db.js
- uploads/
- .env
- package.json

## 2) Setup

### Step 1: Go to backend

```bash
cd Backend
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Run MongoDB

```bash
mongod
```

### Step 4: Run Ollama

```bash
ollama pull phi3
ollama serve
```

### Step 5: Configure `.env`

Use `.env.example` and set values for:
- `MONGODB_URI`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `UPLOAD_MAX_FILE_SIZE_MB`
- `WHATSAPP_VERIFY_TOKEN`
- `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` (for Twilio media fetch)
- `WHATSAPP_CLOUD_TOKEN` (for Meta Cloud API media fetch)

### Step 6: Start backend

```bash
npm run dev
```

Backend base URL: `http://localhost:5000`

## 3) API Endpoints

### Health
- Method: `GET`
- URL: `/health`

### Chat
- Method: `POST`
- URL: `/chat`
- Body:

```json
{
  "userId": "user_001",
  "message": "I have mild headache and fever"
}
```

### OCR Prescription Upload
- Method: `POST`
- URL: `/upload`
- Content-Type: `multipart/form-data`
- Form field: `file` (image or PDF)
- Optional form field: `userId`
- Optional query: `stream=true` (SSE token streaming from LLM)

Success response example:

```json
{
  "success": true,
  "data": {
    "id": "67ef115a77f31e850aebf50f",
    "userId": "user_001",
    "source": "upload",
    "severity": "medium",
    "medicines": [
      {
        "medicineName": "Paracetamol",
        "dosage": "500 mg",
        "instructions": "1 tablet after food, twice daily"
      }
    ],
    "createdAt": "2026-04-04T11:04:59.912Z"
  }
}
```

Failure response example (invalid type):

```json
{
  "success": false,
  "error": {
    "code": "UPLOAD_FILE_TYPE_NOT_ALLOWED",
    "message": "Only image and PDF files are allowed."
  }
}
```

### WhatsApp Webhook Verification (Meta)
- Method: `GET`
- URL: `/webhooks/whatsapp`
- Query params: `hub.mode`, `hub.verify_token`, `hub.challenge`

### WhatsApp Webhook Receiver
- Method: `POST`
- URL: `/webhooks/whatsapp`
- Accepts:
  - Twilio WhatsApp webhook payload (`MediaUrl0`, `MediaContentType0`)
  - Meta Cloud-style payload with `messages[0].image.id`
  - Generic payload with `mediaUrl`

## 4) OCR Pipeline

`POST /upload` and WhatsApp webhook share the same pipeline:
1. Receive file (multer for direct upload, URL download for webhook)
2. Extract text via `extractTextFromImage(filePath)` in `services/ocr.service.js`
3. Send text to LLM with strict JSON prompt
4. Parse and normalize medicine entries
5. Detect severity (`low` / `medium` / `high`)
6. Save to MongoDB (`prescription.model.js`)

LLM prompt behavior:
- Extract: medicine name, dosage, instructions
- Return JSON only

## 5) WhatsApp Image Handling Explained

### Option A: Twilio WhatsApp API
1. Configure Twilio webhook URL to `POST /webhooks/whatsapp`
2. Twilio sends `MediaUrl0` and `MediaContentType0`
3. Backend downloads media URL (with Twilio basic auth if configured)
4. Saved file is passed into the same OCR pipeline

Example Twilio webhook fields used:
- `MediaUrl0`
- `MediaContentType0`
- `From`
- `MessageSid`

### Option B: WhatsApp Business Cloud API (Meta)
1. Configure Meta webhook to `GET/POST /webhooks/whatsapp`
2. Incoming webhook contains image `media_id`
3. Backend calls Graph API `/{media_id}` to get a temporary media URL
4. Backend downloads media with Bearer token
5. Saved file is passed into the same OCR pipeline

## 6) How to Test OCR Endpoint

### cURL (image)

```bash
curl -X POST http://localhost:5000/upload \
  -F "file=@C:/path/to/prescription.jpg" \
  -F "userId=demo_user"
```

### cURL (PDF)

```bash
curl -X POST http://localhost:5000/upload \
  -F "file=@C:/path/to/prescription.pdf"
```

### Streaming mode (SSE)

```bash
curl -N -X POST "http://localhost:5000/upload?stream=true" \
  -F "file=@C:/path/to/prescription.jpg"
```

## 7) Error Handling Included

- Invalid file type rejected with `415`
- Oversized upload rejected with `400`
- Missing file rejected with `400`
- OCR failures normalized with machine-readable error codes
- Invalid LLM JSON output returns `502`
- Centralized error middleware remains active for all endpoints

## 8) Notes on PDF OCR

- Text-based PDFs are parsed directly first for speed
- Scanned PDFs fall back to OCR page rendering with `sharp + tesseract.js`
- If runtime lacks PDF render support in `sharp`, API returns actionable error

## 9) Important Disclaimer

This backend is informational and assistive only.
Always consult a licensed clinician before making medical decisions.
