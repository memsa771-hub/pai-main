import io
import json
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Helper for Word DOCX creation
def generate_docx_resume(user_data, template="ats") -> io.BytesIO:
    doc = Document()
    
    # Set Margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Styles
    style = doc.styles['Normal']
    font = style.font
    if template == "ats":
        font.name = 'Times New Roman'
        font.size = Pt(11)
        font.color.rgb = RGBColor(0, 0, 0)
    else: # modern or europass or academic
        font.name = 'Arial'
        font.size = Pt(10.5)
        font.color.rgb = RGBColor(51, 65, 85) # Slate 700

    # Header Section
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER if template in ["ats", "modern"] else WD_ALIGN_PARAGRAPH.LEFT
    run_name = title_p.add_run(user_data.full_name + "\n")
    run_name.bold = True
    run_name.font.size = Pt(18 if template == "modern" else 16)
    if template == "modern":
        run_name.font.color.rgb = RGBColor(0, 45, 156) # Deep Blue

    info_p = doc.add_paragraph()
    info_p.alignment = WD_ALIGN_PARAGRAPH.CENTER if template in ["ats", "modern"] else WD_ALIGN_PARAGRAPH.LEFT
    
    contact_details = []
    if user_data.email: contact_details.append(user_data.email)
    if user_data.phone: contact_details.append(user_data.phone)
    if user_data.city or user_data.country:
        loc = ", ".join(filter(None, [user_data.city, user_data.country]))
        contact_details.append(loc)
    if user_data.linkedin: contact_details.append(user_data.linkedin)
    
    info_run = info_p.add_run(" | ".join(contact_details))
    info_run.font.size = Pt(9.5)

    # Divider line
    if template == "modern":
        p_divider = doc.add_paragraph()
        p_run = p_divider.add_run("―" * 60)
        p_run.font.color.rgb = RGBColor(226, 232, 240)
        p_divider.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Add Heading Function
    def add_section_heading(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(13)
        if template == "modern":
            run.font.color.rgb = RGBColor(0, 45, 156)
            # Add bottom border via horizontal line
            p_line = doc.add_paragraph()
            p_line.paragraph_format.space_before = Pt(0)
            p_line.paragraph_format.space_after = Pt(4)
            line_run = p_line.add_run("―" * 60)
            line_run.font.size = Pt(6)
            line_run.font.color.rgb = RGBColor(0, 45, 156)

    # Summary
    if user_data.summary:
        add_section_heading("Professional Summary")
        doc.add_paragraph(user_data.summary)

    # Work Experience
    if user_data.work_experience:
        add_section_heading("Work Experience")
        for exp in user_data.work_experience:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(2)
            role_run = p.add_run(f"{exp.role} ")
            role_run.bold = True
            p.add_run(f"at {exp.company}")
            
            p_date = doc.add_paragraph()
            p_date.paragraph_format.space_after = Pt(2)
            date_run = p_date.add_run(exp.period or "")
            date_run.italic = True
            
            if exp.description:
                # Add descriptions by breaking into bullet points
                desc_p = doc.add_paragraph()
                desc_p.paragraph_format.left_indent = Inches(0.25)
                desc_p.add_run(exp.description)

    # Education
    if user_data.education:
        add_section_heading("Education")
        for edu in user_data.education:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(2)
            deg_run = p.add_run(f"{edu.degree} ")
            deg_run.bold = True
            p.add_run(f"― {edu.school}")
            
            p_details = doc.add_paragraph()
            p_details.paragraph_format.space_after = Pt(2)
            p_details.add_run(f"Period: {edu.period or 'N/A'} | GPA: {edu.gpa or 'N/A'}")
            
            if edu.details:
                details_p = doc.add_paragraph()
                details_p.paragraph_format.left_indent = Inches(0.25)
                details_run = details_p.add_run(edu.details)
                details_run.font.size = Pt(9.5)

    # Projects
    if user_data.projects:
        add_section_heading("Projects")
        for proj in user_data.projects:
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(2)
            proj_run = p.add_run(proj.name)
            proj_run.bold = True
            
            if proj.description:
                desc_p = doc.add_paragraph()
                desc_p.paragraph_format.left_indent = Inches(0.25)
                desc_p.add_run(proj.description)

    # Skills
    skills_list = []
    try:
        if user_data.skills:
            skills_list = json.loads(user_data.skills)
    except:
        if isinstance(user_data.skills, str):
            skills_list = [s.strip() for s in user_data.skills.split(",") if s.strip()]

    if skills_list:
        add_section_heading("Skills & Expertise")
        doc.add_paragraph(", ".join(skills_list))

    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    return file_stream


# Helper for PDF creation using reportlab
def generate_pdf_resume(user_data, template="ats") -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom colors
    primary_color = colors.HexColor("#002D9C") if template == "modern" else colors.HexColor("#000000")
    text_color = colors.HexColor("#334155") if template != "ats" else colors.HexColor("#000000")
    line_color = colors.HexColor("#CBD5E1") if template != "ats" else colors.HexColor("#000000")
    
    # Define typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold' if template != "ats" else 'Times-Bold',
        fontSize=20,
        leading=24,
        alignment=1 if template in ["ats", "modern"] else 0, # Center or Left
        textColor=primary_color
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica' if template != "ats" else 'Times-Roman',
        fontSize=10,
        leading=14,
        alignment=1 if template in ["ats", "modern"] else 0,
        textColor=text_color
    )
    
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold' if template != "ats" else 'Times-Bold',
        fontSize=12,
        leading=16,
        spaceBefore=14,
        spaceAfter=6,
        textColor=primary_color
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica' if template != "ats" else 'Times-Roman',
        fontSize=10,
        leading=14,
        textColor=text_color
    )

    bold_body_style = ParagraphStyle(
        'BoldBodyText',
        parent=body_style,
        fontName='Helvetica-Bold' if template != "ats" else 'Times-Bold'
    )
    
    italic_body_style = ParagraphStyle(
        'ItalicBodyText',
        parent=body_style,
        fontName='Helvetica-Oblique' if template != "ats" else 'Times-Italic'
    )

    story = []
    
    # Name
    story.append(Paragraph(user_data.full_name, title_style))
    story.append(Spacer(1, 4))
    
    # Contact Info
    contact_details = []
    if user_data.email: contact_details.append(user_data.email)
    if user_data.phone: contact_details.append(user_data.phone)
    if user_data.city or user_data.country:
        loc = ", ".join(filter(None, [user_data.city, user_data.country]))
        contact_details.append(loc)
    if user_data.linkedin: contact_details.append(user_data.linkedin)
    
    story.append(Paragraph(" | ".join(contact_details), subtitle_style))
    story.append(Spacer(1, 10))

    # Divider line
    divider_table = Table([[""]], colWidths=[504])
    divider_table.setStyle(TableStyle([
        ('LINEABOVE', (0,0), (-1,-1), 1.5 if template == "modern" else 0.5, primary_color if template == "modern" else line_color),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(divider_table)
    story.append(Spacer(1, 10))

    # Add section title wrapper
    def append_section_title(title_text):
        story.append(Paragraph(title_text, heading_style))
        if template == "modern":
            # Add secondary underline
            ul_table = Table([[""]], colWidths=[504])
            ul_table.setStyle(TableStyle([
                ('LINEABOVE', (0,0), (-1,-1), 1, primary_color),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
            ]))
            story.append(ul_table)
            story.append(Spacer(1, 4))

    # 1. Summary
    if user_data.summary:
        append_section_title("Professional Summary")
        story.append(Paragraph(user_data.summary, body_style))
        story.append(Spacer(1, 8))

    # 2. Experience
    if user_data.work_experience:
        append_section_title("Work Experience")
        for exp in user_data.work_experience:
            # Header table (Role / Company on left, Date on right)
            left_p = Paragraph(f"<b>{exp.role}</b> at {exp.company}", body_style)
            right_p = Paragraph(f"<i>{exp.period or ''}</i>", ParagraphStyle('RightItalic', parent=italic_body_style, alignment=2))
            
            exp_table = Table([[left_p, right_p]], colWidths=[350, 154])
            exp_table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2),
                ('TOPPADDING', (0,0), (-1,-1), 2),
            ]))
            story.append(exp_table)
            
            if exp.description:
                story.append(Paragraph(exp.description, ParagraphStyle('BulletText', parent=body_style, leftIndent=12)))
            story.append(Spacer(1, 6))

    # 3. Education
    if user_data.education:
        append_section_title("Education")
        for edu in user_data.education:
            left_p = Paragraph(f"<b>{edu.degree}</b> ― {edu.school}", body_style)
            right_p = Paragraph(f"<i>{edu.period or ''}</i>", ParagraphStyle('RightItalic', parent=italic_body_style, alignment=2))
            
            edu_table = Table([[left_p, right_p]], colWidths=[350, 154])
            edu_table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2),
                ('TOPPADDING', (0,0), (-1,-1), 2),
            ]))
            story.append(edu_table)
            
            gpa_text = f"GPA: {edu.gpa}" if edu.gpa else ""
            details_text = f" • {edu.details}" if edu.details else ""
            if gpa_text or details_text:
                story.append(Paragraph(f"{gpa_text}{details_text}", ParagraphStyle('EduDetails', parent=body_style, leftIndent=12)))
            story.append(Spacer(1, 6))

    # 4. Projects
    if user_data.projects:
        append_section_title("Projects")
        for proj in user_data.projects:
            story.append(Paragraph(f"<b>{proj.name}</b>", body_style))
            if proj.description:
                story.append(Paragraph(proj.description, ParagraphStyle('ProjBullet', parent=body_style, leftIndent=12)))
            story.append(Spacer(1, 6))

    # 5. Skills
    skills_list = []
    try:
        if user_data.skills:
            skills_list = json.loads(user_data.skills)
    except:
        if isinstance(user_data.skills, str):
            skills_list = [s.strip() for s in user_data.skills.split(",") if s.strip()]

    if skills_list:
        append_section_title("Skills & Expertise")
        story.append(Paragraph(", ".join(skills_list), body_style))

    # Build document
    doc.build(story)
    buffer.seek(0)
    return buffer
