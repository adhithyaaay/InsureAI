import io
import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas

from underwriting_summary import build_underwriting_summary
from coverage_service import generate_coverage_recommendation
from policy_products import PRICING_DISCLAIMER



def mask_identifier(val: Any, id_type: str = "") -> str:
    """
    Masks sensitive personal identification numbers for privacy compliance.
    Aadhaar: **** **** 1234
    PAN: ABCDE****F
    """
    if not val:
        return "N/A"
    s = str(val).strip()
    clean = re.sub(r"\s+", "", s)

    # PAN: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
    if re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", clean, re.IGNORECASE):
        upper = clean.upper()
        return f"{upper[:5]}****{upper[-1]}"

    # Aadhaar: 12 digits
    digits_only = re.sub(r"\D", "", s)
    if len(digits_only) == 12:
        return f"**** **** {digits_only[-4:]}"

    # General fallback masking if long string
    if len(s) > 6:
        return f"{s[:2]}****{s[-2:]}"
    return s


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to add 'Page X of Y' and running header/footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Header (Pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 762, "InsureAI Underwriting Assessment Report")
            self.drawRightString(576, 762, "CONFIDENTIAL - UNDERWRITER ACCESS ONLY")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 756, 576, 756)

        # Footer (All pages)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 36, 576, 36)

        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawString(36, 25, "InsureAI Health Underwriting Engine | Human-in-the-Loop Decision Support")
        self.drawRightString(576, 25, page_str)
        self.restoreState()


def generate_underwriting_report_pdf(
    application: Any,
    prediction: Optional[Any] = None,
    documents: Optional[List[Any]] = None,
    decisions: Optional[List[Any]] = None,
) -> bytes:
    """
    Generates a professional, multi-page underwriting assessment PDF report using ReportLab.
    Returns the generated PDF as raw bytes.
    Does NOT mutate any database state or application status.
    """
    docs_list = documents or []
    decisions_list = decisions or []

    # Get structured underwriting intelligence
    summary_data = build_underwriting_summary(
        application=application,
        prediction=prediction,
        documents=docs_list,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=45,
    )

    styles = getSampleStyleSheet()
    primary_color = colors.HexColor("#0F172A")    # Slate 900
    secondary_color = colors.HexColor("#1E3A8A")  # Blue 900
    accent_color = colors.HexColor("#2563EB")     # Blue 600
    text_dark = colors.HexColor("#1E293B")        # Slate 800
    text_muted = colors.HexColor("#64748B")       # Slate 500
    border_color = colors.HexColor("#E2E8F0")     # Slate 200
    bg_light = colors.HexColor("#F8FAFC")         # Slate 50

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=primary_color,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=text_muted,
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=secondary_color,
        spaceBefore=10,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=text_dark,
    )

    body_bold = ParagraphStyle(
        "ReportBodyBold",
        parent=body_style,
        fontName="Helvetica-Bold",
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=text_dark,
    )

    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#991B1B"),
    )

    story = []

    # =========================================================================
    # 1. HEADER SECTION
    # =========================================================================
    header_table_data = [
        [
            Paragraph("<b>INSUREAI</b> &nbsp;|&nbsp; Underwriting Assessment Report", title_style),
            Paragraph(
                f"<b>CONFIDENTIAL</b><br/>Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}<br/>Report Ref: UWR-{application.id:06d}",
                subtitle_style
            ),
        ]
    ]
    header_table = Table(header_table_data, colWidths=[360, 180])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceBefore=4, spaceAfter=10))

    # =========================================================================
    # 2. APPLICATION METADATA & APPLICANT PROFILE
    # =========================================================================
    story.append(Paragraph("1. Applicant Profile & Risk Parameters", section_heading))

    applicant_name = getattr(application.user, "name", "N/A") if application.user else "N/A"
    applicant_email = getattr(application.user, "email", "N/A") if application.user else "N/A"
    sex_label = "Male" if application.sex == 1 else "Female"
    smoker_label = "Yes (Smoker)" if application.smoker == 1 else "No (Non-Smoker)"
    created_date = application.created_at.strftime("%Y-%m-%d %H:%M") if application.created_at else "N/A"

    profile_data = [
        [
            Paragraph("<b>Application ID:</b>", body_style), Paragraph(f"#{application.id}", body_style),
            Paragraph("<b>Submission Date:</b>", body_style), Paragraph(created_date, body_style),
        ],
        [
            Paragraph("<b>Applicant Name:</b>", body_style), Paragraph(applicant_name, body_style),
            Paragraph("<b>Applicant Email:</b>", body_style), Paragraph(applicant_email, body_style),
        ],
        [
            Paragraph("<b>Age:</b>", body_style), Paragraph(f"{application.age} years", body_style),
            Paragraph("<b>Biological Sex:</b>", body_style), Paragraph(sex_label, body_style),
        ],
        [
            Paragraph("<b>BMI:</b>", body_style), Paragraph(f"{application.bmi:.1f}", body_style),
            Paragraph("<b>Smoker Status:</b>", body_style), Paragraph(smoker_label, body_style),
        ],
        [
            Paragraph("<b>Children/Dependents:</b>", body_style), Paragraph(str(application.children), body_style),
            Paragraph("<b>Region:</b>", body_style), Paragraph(application.region.capitalize(), body_style),
        ],
        [
            Paragraph("<b>Current Status:</b>", body_style), Paragraph(f"<b>{application.status}</b>", body_style),
            Paragraph("<b>Review Priority:</b>", body_style), Paragraph(f"<b>{summary_data.get('review_priority', 'MEDIUM')}</b>", body_style),
        ],
    ]

    profile_table = Table(profile_data, colWidths=[110, 160, 110, 160])
    profile_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg_light),
        ("BOX", (0, 0), (-1, -1), 0.5, border_color),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(profile_table)
    story.append(Spacer(1, 10))

    # =========================================================================
    # 3. MACHINE LEARNING RISK ASSESSMENT (XGBoost v2.0)
    # =========================================================================
    story.append(Paragraph("2. Machine Learning Risk Assessment (Champion XGBoost v2.0)", section_heading))

    if prediction:
        charge_formatted = f"INR {prediction.predicted_charge:,.2f}"
        base_formatted = f"INR {prediction.base_charge:,.2f}" if prediction.base_charge else "N/A"
        risk_tier = prediction.risk_level or "Unknown"

        risk_color = colors.HexColor("#059669") if risk_tier.upper() == "LOW" else (
            colors.HexColor("#D97706") if risk_tier.upper() == "MEDIUM" else colors.HexColor("#DC2626")
        )

        ml_kpi_data = [
            [
                Paragraph("<b>Predicted Annual Premium</b>", body_style),
                Paragraph("<b>Baseline Average</b>", body_style),
                Paragraph("<b>Assessed Risk Tier</b>", body_style),
                Paragraph("<b>Model Recommendation</b>", body_style),
            ],
            [
                Paragraph(f"<font size=12 color='{secondary_color.hexval()}'><b>{charge_formatted}</b></font>", body_style),
                Paragraph(f"<font size=10><b>{base_formatted}</b></font>", body_style),
                Paragraph(f"<font size=10 color='{risk_color.hexval()}'><b>{risk_tier.upper()}</b></font>", body_style),
                Paragraph(f"<b>{prediction.recommendation}</b>", body_style),
            ],
        ]
        ml_table = Table(ml_kpi_data, colWidths=[150, 120, 110, 160])
        ml_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ("BACKGROUND", (0, 1), (-1, 1), colors.white),
            ("BOX", (0, 0), (-1, -1), 0.5, border_color),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(ml_table)
    else:
        story.append(Paragraph("<i>No ML prediction generated for this application yet.</i>", body_style))

    story.append(Spacer(1, 10))

    # =========================================================================
    # 4. TREESHAP EXPLAINABILITY ATTRIBUTIONS
    # =========================================================================
    story.append(Paragraph("3. TreeSHAP Actuarial Feature Contributions", section_heading))

    shap_data = summary_data.get("shap_summary", {})
    top_pos = shap_data.get("top_positive_factors", [])
    top_neg = shap_data.get("top_negative_factors", [])

    if top_pos or top_neg:
        shap_rows = [
            [
                Paragraph("Direction", table_header_style),
                Paragraph("Feature / Risk Factor", table_header_style),
                Paragraph("Applicant Value", table_header_style),
                Paragraph("SHAP Impact", table_header_style),
                Paragraph("Underwriting Context", table_header_style),
            ]
        ]

        # Positive cost drivers (increase premium)
        for factor in top_pos:
            impact_str = f"+INR {abs(factor.get('impact', 0.0)):,.2f}"
            shap_rows.append([
                Paragraph("<font color='#DC2626'><b>Cost Driver (+)</b></font>", table_cell_style),
                Paragraph(f"<b>{factor.get('feature', '').title()}</b>", table_cell_style),
                Paragraph(str(factor.get("value", "")), table_cell_style),
                Paragraph(f"<font color='#DC2626'><b>{impact_str}</b></font>", table_cell_style),
                Paragraph(factor.get("description") or "Increases actuarial loss probability", table_cell_style),
            ])

        # Negative cost drivers (decrease premium)
        for factor in top_neg:
            impact_str = f"-INR {abs(factor.get('impact', 0.0)):,.2f}"
            shap_rows.append([
                Paragraph("<font color='#059669'><b>Discount Factor (-)</b></font>", table_cell_style),
                Paragraph(f"<b>{factor.get('feature', '').title()}</b>", table_cell_style),
                Paragraph(str(factor.get("value", "")), table_cell_style),
                Paragraph(f"<font color='#059669'><b>{impact_str}</b></font>", table_cell_style),
                Paragraph(factor.get("description") or "Favorable risk profile lowers premium", table_cell_style),
            ])

        shap_table = Table(shap_rows, colWidths=[90, 105, 85, 95, 165])
        shap_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), secondary_color),
            ("BOX", (0, 0), (-1, -1), 0.5, border_color),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(shap_table)
    else:
        story.append(Paragraph("<i>No TreeSHAP feature attributions available.</i>", body_style))

    story.append(Spacer(1, 10))

    # =========================================================================
    # 5. DOCUMENT INTELLIGENCE & OCR VERIFICATION (Phase 7)
    # =========================================================================
    story.append(Paragraph("4. Document Intelligence & Verification Audit (Phase 7)", section_heading))

    doc_findings = summary_data.get("document_findings", {})
    doc_summary_text = (
        f"Total Uploaded: {doc_findings.get('total_documents', 0)} | "
        f"Processed: {doc_findings.get('processed_documents', 0)} | "
        f"Verified Fields: {doc_findings.get('verified_fields_count', 0)} | "
        f"Discrepancies: {doc_findings.get('discrepancy_count', 0)}"
    )
    story.append(Paragraph(f"<b>Audit Summary:</b> {doc_summary_text}", body_style))
    story.append(Spacer(1, 4))

    if docs_list:
        doc_table_rows = [
            [
                Paragraph("Document Type", table_header_style),
                Paragraph("Filename", table_header_style),
                Paragraph("OCR / Extraction", table_header_style),
                Paragraph("Status", table_header_style),
                Paragraph("Verification Status / Masked ID", table_header_style),
            ]
        ]
        for d in docs_list:
            status = getattr(d, "status", "UPLOADED")
            doc_type = getattr(d, "document_type", "Document")
            method = getattr(d, "extraction_method", "None") or "None"

            # Parse structured data to get masked ID if present
            masked_id = "N/A"
            if getattr(d, "structured_data_json", None):
                try:
                    s_data = json.loads(d.structured_data_json)
                    for k in ["id_number", "aadhaar_number", "pan_number", "document_id"]:
                        if k in s_data and s_data[k]:
                            masked_id = mask_identifier(s_data[k], doc_type)
                            break
                except Exception:
                    masked_id = "N/A"

            discrepancy_cnt = getattr(d, "discrepancy_count", 0)
            status_text = (
                f"<font color='#DC2626'><b>{discrepancy_cnt} Discrepancies</b></font>"
                if discrepancy_cnt > 0
                else "<font color='#059669'><b>Verified Clean</b></font>"
            )

            doc_table_rows.append([
                Paragraph(f"<b>{doc_type}</b>", table_cell_style),
                Paragraph(getattr(d, "filename", "unnamed"), table_cell_style),
                Paragraph(str(method), table_cell_style),
                Paragraph(str(status), table_cell_style),
                Paragraph(f"{status_text}<br/>ID: {masked_id}", table_cell_style),
            ])

        doc_table = Table(doc_table_rows, colWidths=[90, 120, 110, 85, 135])
        doc_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), primary_color),
            ("BOX", (0, 0), (-1, -1), 0.5, border_color),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(doc_table)
    else:
        story.append(Paragraph("<i>No documents submitted for this application.</i>", body_style))

    story.append(Spacer(1, 10))

    # =========================================================================
    # 6. UNDERWRITING INTELLIGENCE & RISK INDICATORS (Phase 8)
    # =========================================================================
    story.append(Paragraph("5. Underwriting Review Indicators & Synthesis (Phase 8)", section_heading))

    indicators = summary_data.get("risk_indicators", [])
    if indicators:
        ind_rows = [
            [
                Paragraph("Severity", table_header_style),
                Paragraph("Category", table_header_style),
                Paragraph("Indicator Rule", table_header_style),
                Paragraph("Finding / Underwriter Context", table_header_style),
            ]
        ]
        severity_colors = {
            "critical": colors.HexColor("#DC2626"),
            "warning": colors.HexColor("#D97706"),
            "attention": colors.HexColor("#2563EB"),
            "info": colors.HexColor("#64748B"),
        }

        for ind in indicators:
            sev = ind.get("severity", "info").lower()
            sev_color = severity_colors.get(sev, colors.HexColor("#64748B"))
            ind_rows.append([
                Paragraph(f"<font color='{sev_color.hexval()}'><b>{sev.upper()}</b></font>", table_cell_style),
                Paragraph(ind.get("category", "").title(), table_cell_style),
                Paragraph(f"<b>{ind.get('title', ind.get('code'))}</b>", table_cell_style),
                Paragraph(ind.get("message", ""), table_cell_style),
            ])

        ind_table = Table(ind_rows, colWidths=[65, 80, 140, 255])
        ind_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), secondary_color),
            ("BOX", (0, 0), (-1, -1), 0.5, border_color),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(ind_table)
    else:
        story.append(Paragraph("<i>No risk indicators or discrepancies triggered for this applicant.</i>", body_style))

    story.append(Spacer(1, 6))

    # Narrative paragraph
    narrative_text = summary_data.get("summary_narrative") or summary_data.get("summary") or "Evaluation pending."
    narrative_box = [
        [
            Paragraph("<b>Synthesized Underwriting Narrative:</b><br/>" + narrative_text, body_style)
        ]
    ]
    nar_table = Table(narrative_box, colWidths=[540])
    nar_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg_light),
        ("BOX", (0, 0), (-1, -1), 0.5, border_color),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(nar_table)
    story.append(Spacer(1, 10))

    # =========================================================================
    # 6. COVERAGE & POLICY RECOMMENDATION (PROTOTYPE)
    # =========================================================================
    story.append(Paragraph("6. Coverage & Policy Recommendation (Prototype)", section_heading))

    if prediction:
        cov_rec = generate_coverage_recommendation(
            application=application,
            prediction=prediction,
        )
        cov_options = cov_rec.get("coverage_options", [])
        suggested_code = cov_rec.get("suggested_product_code", "STANDARD_10L")
        suggested_name = cov_rec.get("suggested_product_name", "Standard Health Plan")
        rec_reason = cov_rec.get("recommendation_reason", "Underwriting review recommended.")

        cov_rows = [
            [
                Paragraph("Product Code & Name", table_header_style),
                Paragraph("Sum Insured", table_header_style),
                Paragraph("Policy Term", table_header_style),
                Paragraph("Multiplier", table_header_style),
                Paragraph("Indicative Premium", table_header_style),
                Paragraph("Recommendation", table_header_style),
            ]
        ]
        for opt in cov_options:
            is_suggested = opt["product_code"] == suggested_code
            status_text = (
                "<font color='#0D9488'><b>Suggested for Review</b></font>"
                if is_suggested
                else "<font color='#64748B'>Available Option</font>"
            )
            multiplier_val = f"{opt['indicative_premium'] / opt['base_predicted_premium']:.2f}x" if opt.get("base_predicted_premium") else "1.00x"
            cov_rows.append([
                Paragraph(f"<b>{opt['product_name']}</b><br/><font color='#64748B'>{opt['product_code']}</font>", table_cell_style),
                Paragraph(f"<b>{opt['coverage_display']}</b>", table_cell_style),
                Paragraph(f"{opt['policy_period_years']} Year", table_cell_style),
                Paragraph(multiplier_val, table_cell_style),
                Paragraph(f"<b>₹{opt['indicative_premium']:,.2f}</b>", table_cell_style),
                Paragraph(status_text, table_cell_style),
            ])

        cov_table = Table(cov_rows, colWidths=[140, 75, 60, 55, 95, 115])
        cov_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), secondary_color),
            ("BOX", (0, 0), (-1, -1), 0.5, border_color),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(cov_table)
        story.append(Spacer(1, 6))

        # Suggested plan highlight callout box
        suggested_box = [
            [
                Paragraph(
                    f"<b>Suggested for Underwriter Review:</b> {suggested_name} ({suggested_code})<br/>"
                    f"<b>Indicative Benchmark Premium:</b> ₹{next((o['indicative_premium'] for o in cov_options if o['product_code'] == suggested_code), 0.0):,.2f}<br/>"
                    f"<b>Recommendation Rationale:</b> {rec_reason}<br/>"
                    f"<font color='#64748B'><i>Note: {cov_rec.get('pricing_disclaimer', PRICING_DISCLAIMER)}</i></font>",
                    body_style
                )
            ]
        ]
        sug_table = Table(suggested_box, colWidths=[540])
        sug_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F0FDFA")),  # Teal 50
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#0D9488")),    # Teal 600
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(sug_table)
    else:
        story.append(Paragraph("<i>No ML premium assessment available to compute coverage options.</i>", body_style))

    story.append(Spacer(1, 10))

    # =========================================================================
    # 7. UNDERWRITER DECISION AUDIT TRAIL
    # =========================================================================
    story.append(Paragraph("7. Underwriter Decision Audit Trail", section_heading))


    if decisions_list:
        dec_rows = [
            [
                Paragraph("Decision ID", table_header_style),
                Paragraph("Verdict", table_header_style),
                Paragraph("Underwriter", table_header_style),
                Paragraph("Recorded At", table_header_style),
                Paragraph("Notes & Justification", table_header_style),
            ]
        ]
        for dec in decisions_list:
            u_name = getattr(dec.underwriter, "name", "N/A") if dec.underwriter else f"Underwriter #{getattr(dec, 'underwriter_id', 'N/A')}"
            dec_time = dec.created_at.strftime("%Y-%m-%d %H:%M") if dec.created_at else "N/A"
            dec_verdict = getattr(dec, "decision", "PENDING").upper()

            dec_color = (
                "#059669" if dec_verdict in ["APPROVE", "APPROVED"]
                else ("#DC2626" if dec_verdict in ["REJECT", "REJECTED"] else "#D97706")
            )

            dec_rows.append([
                Paragraph(f"#{dec.id}", table_cell_style),
                Paragraph(f"<font color='{dec_color}'><b>{dec_verdict}</b></font>", table_cell_style),
                Paragraph(u_name, table_cell_style),
                Paragraph(dec_time, table_cell_style),
                Paragraph(getattr(dec, "notes", "") or "No notes recorded.", table_cell_style),
            ])

        dec_table = Table(dec_rows, colWidths=[65, 80, 100, 95, 200])
        dec_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), primary_color),
            ("BOX", (0, 0), (-1, -1), 0.5, border_color),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(dec_table)
    else:
        story.append(Paragraph("<i>No decisions recorded yet. Application is pending underwriter review.</i>", body_style))

    story.append(Spacer(1, 12))

    # =========================================================================
    # 8. HUMAN-IN-THE-LOOP GOVERNANCE & COMPLIANCE NOTICE
    # =========================================================================
    gov_disclaimer = (
        "<b>HUMAN-IN-THE-LOOP COMPLIANCE & GOVERNANCE NOTICE:</b><br/>"
        "AI model predictions (XGBoost v2.0), TreeSHAP feature attributions, and document consistency verifications "
        "are generated strictly as decision-support intelligence for licensed human underwriters. InsureAI does not "
        "make automated binding policy approvals, rejections, or premium modifications. Final underwriting decisions, "
        "rating, risk tier assignments, and policy binding rest exclusively with authorized underwriting personnel."
    )
    gov_box = Table(
        [[Paragraph(gov_disclaimer, disclaimer_style)]],
        colWidths=[540],
    )
    gov_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF2F2")),  # Red 50
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#F87171")),       # Red 400
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(KeepTogether([gov_box]))

    # Build PDF with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()
