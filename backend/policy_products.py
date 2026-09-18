"""
Policy Products Catalog - Phase 10 Prototype
Configurable health insurance policy products and demonstration pricing multipliers.

IMPORTANT:
These are demonstration prototype products, NOT real insurer quotes or actuarial tariffs.
Final underwriting decisions and binding authority remain strictly with the human underwriter.
"""

from typing import Dict, Any, List


PRICING_DISCLAIMER = "Indicative prototype pricing — not an insurer quote."

HUMAN_IN_THE_LOOP_DISCLAIMER = (
    "Coverage and premium figures shown here are prototype decision-support estimates based on the project's "
    "current model and configurable product assumptions. They are not official insurance quotations. "
    "Final coverage, premium, eligibility, exclusions and policy terms must be determined by the insurer "
    "and authorized underwriter."
)

PRODUCT_CATALOG: List[Dict[str, Any]] = [
    {
        "product_code": "BASIC_5L",
        "product_name": "Basic Health Plan",
        "coverage_amount": 500000.0,
        "coverage_display": "₹5,00,000",
        "policy_period_years": 1,
        "multiplier": 0.85,
        "description": "Essential healthcare protection designed for individual baseline medical coverage.",
    },
    {
        "product_code": "STANDARD_10L",
        "product_name": "Standard Health Plan",
        "coverage_amount": 1000000.0,
        "coverage_display": "₹10,00,000",
        "policy_period_years": 1,
        "multiplier": 1.00,
        "description": "Comprehensive health coverage balancing balanced financial protection and routine hospitalisation coverage.",
    },
    {
        "product_code": "PREMIUM_20L",
        "product_name": "Premium Health Plan",
        "coverage_amount": 2000000.0,
        "coverage_display": "₹20,00,000",
        "policy_period_years": 1,
        "multiplier": 1.35,
        "description": "Extensive health coverage designed for comprehensive family protection and critical medical security.",
    },
]


def get_product_by_code(product_code: str) -> Dict[str, Any]:
    """Retrieves a product definition by its unique product code."""
    for prod in PRODUCT_CATALOG:
        if prod["product_code"] == product_code:
            return prod
    return PRODUCT_CATALOG[1]  # Default to STANDARD_10L if not found
