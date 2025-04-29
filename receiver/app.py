from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (including Chrome extension)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)


@app.post("/add")
async def add_data(request: Request):
    data = await request.json()
    print("Received data:", data)
    return {"status": "success", "message": "Data received"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
