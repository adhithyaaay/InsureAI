from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from schemas import Customer, PredictionResponse
from predictor import predict_charge

app = FastAPI(
    title="InsureAI API",
    description="AI Underwriting & Insurance Charge Prediction API",
    version="1.0.0"
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Welcome to InsureAI API"
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(customer: Customer):

    prediction = predict_charge(customer)

    if prediction < 8000:
        risk = "Low"
        recommendation = "Eligible for Standard Premium"

    elif prediction < 20000:
        risk = "Medium"
        recommendation = "Additional document verification recommended"

    else:
        risk = "High"
        recommendation = "Manual underwriting review required"

    return PredictionResponse(
        predicted_charge=prediction,
        risk_level=risk,
        recommendation=recommendation
    )