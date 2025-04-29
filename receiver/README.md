# API Receiver

A simple REST API built with FastAPI that receives and processes data.

## Setup

1. Install dependencies:

```
pip install -r requirements.txt
```

2. Run the server:

```
fastapi run app.py
```

## API Endpoints

### POST /add

Receives data in the request body and processes it.

Example usage with curl:

```
curl -X POST http://localhost:8000/add \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

The server will print the received data and return a success message.
