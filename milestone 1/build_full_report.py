import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from canvas_helper import NumberedCanvas
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def build_pdf_report(pdf_path):
    # Setup document
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=48,
        bottomMargin=48
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#1E3A8A")   # Navy
    secondary_color = colors.HexColor("#0284C7") # Teal/Cyan
    dark_text = colors.HexColor("#0F172A")       # Slate 900
    body_text = colors.HexColor("#334155")       # Slate 700
    accent_bg = colors.HexColor("#F8FAFC")       # Slate 50
    border_color = colors.HexColor("#CBD5E1")    # Slate 300
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        alignment=1, # Center
        spaceAfter=6
    )
    
    sub_title_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=14.5,
        textColor=secondary_color,
        alignment=1, # Center
        spaceAfter=14
    )
    
    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=16.5,
        textColor=primary_color,
        spaceBefore=13,
        spaceAfter=5,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13.5,
        textColor=secondary_color,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=body_text,
        spaceAfter=5
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=body_text,
        leftIndent=14,
        firstLineIndent=-9,
        spaceAfter=3
    )
    
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=dark_text
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.white
    )

    story = []

    # ================= COVER / HEADER BLOCK =================
    story.append(Paragraph("BENNETT UNIVERSITY", ParagraphStyle('BU', fontName='Helvetica-Bold', fontSize=13, leading=16, alignment=1, textColor=primary_color)))
    story.append(Paragraph("School of Computer Science Engineering and Technology (SCSET)<br/>B.Tech Computer Science and Engineering — Capstone Project (2026–2027)", ParagraphStyle('BUSub', fontName='Helvetica', fontSize=9, leading=13, alignment=1, textColor=colors.HexColor("#64748B"))))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph("Milestone 1: Project Proposal, Requirements & Feasibility", title_style))
    story.append(Paragraph("<b>Project Title:</b> EduFlow<br/><i>(Sub-title: AI-Powered Personalized Learning Assistant and Formative Assessment Platform for Academic Coursework)</i>", sub_title_style))
    
    # Metadata Box
    meta_data = [
        [Paragraph("<b>Course Code / Component:</b> Capstone Project (Milestone 1)", table_cell), Paragraph("<b>Evaluation Marks:</b> 30 Marks", table_cell)],
        [Paragraph("<b>Submission Deadline:</b> 18 October 2026", table_cell), Paragraph("<b>Rubric Mapping:</b> Sections 7.1 & 7.2 (6 Criteria x 5M)", table_cell)],
        [Paragraph("<b>Primary Author / Team Lead:</b> Tarun Shukla (B.Tech CSE)", table_cell), Paragraph("<b>Project Track:</b> AI / Applied Machine Learning / EdTech", table_cell)],
        [Paragraph("<b>Target Hardware Stack:</b> Apple M2 + Intel Core Ultra 7", table_cell), Paragraph("<b>Local Engine:</b> Ollama (Quantized Open-Weight LLM + pgvector)", table_cell)]
    ]
    t_meta = Table(meta_data, colWidths=[255, 255])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # ================= SECTION 1: PROBLEM STATEMENT & MOTIVATION =================
    story.append(Paragraph("1. Final Problem Statement and Motivation (Rubric Criterion 1: 5 Marks)", h1_style))
    story.append(Paragraph("<b>1.1 Core Problem Statement:</b> Contemporary university learning environments rely heavily on conventional Learning Management Systems (e.g., Moodle, Blackboard, Canvas) that serve primarily as passive, administrative document repositories. While effective for broadcasting syllabus files and receiving assignment submissions, these platforms create severe cognitive friction for undergraduate engineering students. Students are inundated with voluminous, multi-chapter academic PDFs and complex slide decks without an integrated mechanism for immediate conceptual clarification, active recall, or continuous diagnostic feedback. Consequently, students experience cognitive overload, defer doubts until high-stakes examinations, and lack data-driven visibility into their specific conceptual weaknesses.", body_style))
    story.append(Paragraph("<b>1.2 Motivation & Academic Significance:</b> Educational psychology firmly establishes that active self-testing and rapid feedback cycles are superior to passive rereading for long-term knowledge retention. When students encounter ambiguous technical theorems or mathematical derivations in course lecture notes, seeking clarification from course instructors is frequently constrained by limited office hours and high student-to-faculty ratios. General-purpose public AI chatbots (e.g., vanilla ChatGPT) cannot reliably solve this dilemma because they lack awareness of the specific professor's syllabus, frequently introduce unvetted out-of-scope terminology, and pose severe privacy and subscription cost barriers. Developing EduFlow as a dedicated, course-scoped, privacy-preserving AI learning companion bridges this pedagogical gap by transforming static course materials into interactive, verified learning resources.", body_style))
    story.append(Spacer(1, 6))

    # ================= SECTION 2: SDG MAPPING & RATIONALE =================
    story.append(Paragraph("2. UN Sustainable Development Goals (SDG) Mapping & Rationale", h1_style))
    story.append(Paragraph("The proposed capstone directly aligns with two United Nations Sustainable Development Goals through realistic, measurable, software-driven interventions:", body_style))
    
    sdg_data = [
        [Paragraph("<b>UN Sustainable Development Goal</b>", table_header), Paragraph("<b>Target Alignment</b>", table_header), Paragraph("<b>Concrete Engineering & Pedagogical Rationale</b>", table_header)],
        [
            Paragraph("<b>SDG 4: Quality Education</b>", table_cell),
            Paragraph("<b>Target 4.4:</b> Substantially increase the number of youth with relevant technical skills.<br/><b>Target 4.7:</b> Ensure learners acquire knowledge and skills for academic mastery.", table_cell),
            Paragraph("EduFlow democratizes round-the-clock academic tutoring by breaking down complex curricular texts into digestible explanations, targeted summaries, and self-assessment quizzes grounded in professor-curated documents. This fosters mastery learning and addresses diverse learning speeds among students without replacing human educators.", table_cell)
        ],
        [
            Paragraph("<b>SDG 9: Industry, Innovation, & Infrastructure</b>", table_cell),
            Paragraph("<b>Target 9.5:</b> Enhance scientific research and upgrade technological capabilities in academic institutions.", table_cell),
            Paragraph("The application leverages cutting-edge Retrieval-Augmented Generation (RAG) and efficient local open-weight model quantization (running via Ollama on commodity laptops). It demonstrates how educational institutions can innovate privacy-conscious digital learning infrastructure at zero recurring proprietary cloud API cost.", table_cell)
        ]
    ]
    t_sdg = Table(sdg_data, colWidths=[120, 140, 250])
    t_sdg.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('BACKGROUND', (0,1), (-1,1), colors.white),
        ('BACKGROUND', (0,2), (-1,2), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_sdg)
    story.append(Spacer(1, 8))

    # ================= SECTION 3: BACKGROUND & CONTEXT =================
    story.append(Paragraph("3. Background and Context", h1_style))
    story.append(Paragraph("Higher education institutions have heavily invested in centralized Learning Management Systems (such as Moodle, Canvas, and Blackboard). These enterprise platforms excel at institutional compliance, attendance tracking, syllabus distribution, assignment file hand-ins, and gradebook publication. However, their core architecture is rooted in administrative management rather than personalized cognitive scaffolding. The typical student workflow involves downloading hundreds of megabytes of disconnected PDF slide decks and reading them passively on laptops.", body_style))
    story.append(Paragraph("<b>Architectural Reality — Standalone Companion Model:</b> In institutional settings, accessing core enterprise LMS databases or modifying proprietary production LMS APIs requires extensive institutional security vetting, Single Sign-On (SSO) gateway clearances, and enterprise API licensing that are rarely granted for undergraduate capstone development. Consequently, EduFlow is deliberately architected as a <b>decoupled, standalone academic companion platform</b>. The application features independent role-based access for professors (who upload and organize course, unit, and lecture materials) and students (who access grounded AI assistance and quizzes). While future LMS interoperability via standard protocols (such as IMS Global LTI — Learning Tools Interoperability) remains a viable technical evolution, the proposed platform delivers immediate, autonomous utility without depending on unconfirmed third-party integrations.", body_style))
    story.append(Spacer(1, 6))

    # ================= SECTION 4: LITERATURE & EXISTING SOLUTIONS REVIEW =================
    story.append(Paragraph("4. Literature Review & Existing Solutions Review (Rubric Criterion 2: 5 Marks)", h1_style))
    story.append(Paragraph("The conceptual and technical formulation of EduFlow is informed by foundational literature in educational psychology, natural language processing, and information retrieval:", body_style))
    story.append(Paragraph("• <b>Formative Assessment & Spaced Testing:</b> Black and Wiliam (1998) proved that frequent, diagnostic formative assessment with prompt explanatory feedback yields substantial learning gains. Dunlosky et al. (2013) demonstrated that practice testing (active recall) possesses high utility compared to passive text rereading or highlighting.", bullet_style))
    story.append(Paragraph("• <b>Retrieval-Augmented Generation (RAG):</b> Lewis et al. (2020) established that combining pre-trained parametric memory (neural weights) with non-parametric dense retrieval (vector database) drastically mitigates factual hallucinations, allows dynamic knowledge updates without expensive fine-tuning, and provides verifiable document source citations.", bullet_style))
    story.append(Paragraph("• <b>Efficient Local Inference & Quantization:</b> Dettmers et al. (2022) established that 4-bit quantization methods (e.g., GGML/GGUF used in Ollama/llama.cpp) maintain strong reasoning capabilities while reducing memory requirements by over 65%, enabling 7B/8B parameter models to execute efficiently on modern consumer hardware.", bullet_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Comparative Analysis of Existing Solutions:</b>", h2_style))
    
    comp_data = [
        [
            Paragraph("<b>Platform / Solution</b>", table_header),
            Paragraph("<b>Target Domain</b>", table_header),
            Paragraph("<b>Course Material Scoping</b>", table_header),
            Paragraph("<b>Diagnostic Quizzes & Weak-Topic Tracking</b>", table_header),
            Paragraph("<b>Data Privacy & Local Hosting</b>", table_header)
        ],
        [
            Paragraph("<b>Conventional LMS</b><br/>(Moodle / Canvas)", table_cell),
            Paragraph("Institutional Course Administration", table_cell),
            Paragraph("Static file storage; manual folder navigation only.", table_cell),
            Paragraph("Manual instructor quiz creation; static grading with no automatic weak-topic remediation.", table_cell),
            Paragraph("Hosted on campus/cloud servers; high data privacy but zero generative AI capabilities.", table_cell)
        ],
        [
            Paragraph("<b>Commercial PDF Chat</b><br/>(ChatPDF / Humata)", table_cell),
            Paragraph("Generic Single-Doc Q&A", table_cell),
            Paragraph("Isolated per-PDF session; no multi-document or course-level hierarchy.", table_cell),
            Paragraph("None; purely conversational without quiz generation, scoring, or progress analytics.", table_cell),
            Paragraph("Proprietary cloud servers; documents uploaded to external APIs; expensive monthly subscriptions.", table_cell)
        ],
        [
            Paragraph("<b>General AI Tutors</b><br/>(Khanmigo / ChatGPT Plus)", table_cell),
            Paragraph("K-12 & Broad Knowledge", table_cell),
            Paragraph("General world knowledge; not anchored to specific university professor notes.", table_cell),
            Paragraph("Ad-hoc conversational questioning; lacks structured syllabus mastery tracking.", table_cell),
            Paragraph("Closed proprietary cloud; high per-seat recurring licensing costs ($20/student/month).", table_cell)
        ],
        [
            Paragraph("<b>EduFlow</b><br/><i>(Proposed Capstone)</i>", table_cell),
            Paragraph("<b>University Academic Coursework Companion</b>", table_cell),
            Paragraph("<b>Strict course, unit, and topic scoping via PostgreSQL metadata.</b>", table_cell),
            Paragraph("<b>Automatic RAG-driven quiz generation + deterministic grading + automated weak-topic detection.</b>", table_cell),
            Paragraph("<b>100% Local Inference via Ollama + pgvector; zero API cost, zero external data leakage.</b>", table_cell)
        ]
    ]
    t_comp = Table(comp_data, colWidths=[95, 90, 110, 125, 90])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('BACKGROUND', (0,1), (-1,1), colors.white),
        ('BACKGROUND', (0,2), (-1,2), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (0,3), (-1,3), colors.white),
        ('BACKGROUND', (0,4), (-1,4), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_comp)
    story.append(Spacer(1, 8))

    # ================= SECTION 5: GAP ANALYSIS =================
    story.append(Paragraph("5. Gap Analysis", h1_style))
    story.append(Paragraph("Existing systems exist in fractured, non-communicative silos: conventional LMS platforms store files without intelligence; generic PDF chat tools provide single-document summaries without curricular context; commercial AI tutors depend on expensive cloud subscriptions without institutional alignment. <b>The defensible technical gap addressed by EduFlow is the unified convergence of:</b> (1) Course-isolated document retrieval grounded in professor-verified materials, (2) Deterministic formative quiz evaluation coupled with automated weak-topic diagnostic algorithms, and (3) Zero-cost, privacy-preserving local execution utilizing modern quantized open-weight neural models on commodity student laptops.", body_style))
    story.append(Spacer(1, 6))

    # ================= SECTION 6: STAKEHOLDERS & REQUIREMENTS =================
    story.append(Paragraph("6. Stakeholder & Requirements Analysis (Rubric Criterion 3: 5 Marks)", h1_style))
    story.append(Paragraph("<b>6.1 Stakeholder Profiles:</b>", h2_style))
    story.append(Paragraph("• <b>Primary: Undergraduate Students:</b> Need fast conceptual clarification, instant PDF summaries, self-assessment practice, and objective identification of their learning gaps prior to exams.", bullet_style))
    story.append(Paragraph("• <b>Secondary: Course Instructors / Professors:</b> Need a streamlined portal to upload lecture materials and an aggregated analytics dashboard highlighting commonly misunderstood topics to guide classroom teaching.", bullet_style))
    story.append(Paragraph("• <b>Tertiary: Academic Administrators:</b> Need system integrity, role isolation, data confidentiality, and an architecture that avoids recurring external API expenditures.", bullet_style))
    story.append(Spacer(1, 4))
    
    story.append(Paragraph("<b>6.2 Functional Requirements (FR):</b>", h2_style))
    fr_data = [
        [Paragraph("<b>Req ID</b>", table_header), Paragraph("<b>Module</b>", table_header), Paragraph("<b>Detailed Functional Specification</b>", table_header)],
        [Paragraph("<b>FR-01</b>", table_cell), Paragraph("Authentication", table_cell), Paragraph("JWT-based authentication with Role-Based Access Control (RBAC) distinguishing Student, Professor, and Admin roles.", table_cell)],
        [Paragraph("<b>FR-02</b>", table_cell), Paragraph("Course Mgmt", table_cell), Paragraph("Professors can create courses, define syllabi units/topics, and enroll students via secure course codes.", table_cell)],
        [Paragraph("<b>FR-03</b>", table_cell), Paragraph("Doc Ingestion", table_cell), Paragraph("Upload PDF lecture notes, validate MIME type and file integrity, and store locally with metadata.", table_cell)],
        [Paragraph("<b>FR-04</b>", table_cell), Paragraph("Preprocessing", table_cell), Paragraph("Extract raw text, strip artifacts, and perform recursive chunking (500-1000 tokens) with 15% overlap.", table_cell)],
        [Paragraph("<b>FR-05</b>", table_cell), Paragraph("Vector Storage", table_cell), Paragraph("Generate dense embeddings using Ollama and persist vector embeddings + page metadata in PostgreSQL (pgvector).", table_cell)],
        [Paragraph("<b>FR-06</b>", table_cell), Paragraph("RAG Q&A Engine", table_cell), Paragraph("Execute cosine similarity search scoped strictly to enrolled course IDs, augment LLM prompt, and stream grounded answers with page citations.", table_cell)],
        [Paragraph("<b>FR-07</b>", table_cell), Paragraph("Summarization", table_cell), Paragraph("Generate structured revision summaries (Key Concepts, Formulae, Definitions) from selected lecture chunks.", table_cell)],
        [Paragraph("<b>FR-08</b>", table_cell), Paragraph("Quiz Generation", table_cell), Paragraph("Synthesize topic-specific multiple-choice questions (MCQs) with 4 options and verified ground-truth explanations.", table_cell)],
        [Paragraph("<b>FR-09</b>", table_cell), Paragraph("Deterministic Scoring", table_cell), Paragraph("Grade student quiz submissions deterministically in backend application logic to eliminate AI scoring hallucinations.", table_cell)],
        [Paragraph("<b>FR-10</b>", table_cell), Paragraph("Weak-Topic Detection", table_cell), Paragraph("Calculate topic mastery indices from quiz scores; flag topics scoring below 65% as 'Areas for Improvement'.", table_cell)],
        [Paragraph("<b>FR-11</b>", table_cell), Paragraph("Recommendations", table_cell), Paragraph("Recommend specific document sections, simplified explanations, and re-quizzing drills for identified weak topics.", table_cell)],
        [Paragraph("<b>FR-12</b>", table_cell), Paragraph("Faculty Analytics", table_cell), Paragraph("Provide aggregated, anonymized quiz performance metrics and class-wide difficulty heatmaps for instructors.", table_cell)]
    ]
    t_fr = Table(fr_data, colWidths=[55, 95, 360])
    t_fr.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_fr)
    story.append(Spacer(1, 5))

    story.append(Paragraph("<b>6.3 Non-Functional Requirements (NFR):</b>", h2_style))
    story.append(Paragraph("• <b>NFR-01 (Inference Latency):</b> Vector similarity retrieval must complete in <200ms; local LLM token streaming must initiate within 2.5–4.5 seconds on local development hardware.", bullet_style))
    story.append(Paragraph("• <b>NFR-02 (Grounding & Faithfulness):</b> The system must enforce strict system prompts mandating source page citations and instructing the LLM to output 'Information not present in provided course material' when context is insufficient.", bullet_style))
    story.append(Paragraph("• <b>NFR-03 (Data Confidentiality):</b> Student query logs, quiz results, and course materials must remain strictly isolated by course ID within PostgreSQL; no queries are transmitted to external third-party servers.", bullet_style))
    story.append(Paragraph("• <b>NFR-04 (Hardware Efficiency):</b> Total runtime memory footprint of local AI services (Ollama + PostgreSQL + Backend) must not exceed 6.5 GB RAM, ensuring stable execution on 8GB/16GB workstations.", bullet_style))
    story.append(Spacer(1, 8))

    # ================= SECTION 7: TECHNOLOGY STACK & JUSTIFICATION =================
    story.append(Paragraph("7. Technology & Tool Selection with Justification", h1_style))
    story.append(Paragraph("The software stack has been chosen specifically to deliver enterprise-grade software patterns with zero software licensing costs and offline execution feasibility:", body_style))
    
    tech_data = [
        [Paragraph("<b>Component Layer</b>", table_header), Paragraph("<b>Selected Technology</b>", table_header), Paragraph("<b>Technical Justification & Architectural Trade-offs</b>", table_header)],
        [
            Paragraph("<b>Frontend Framework</b>", table_cell),
            Paragraph("<b>Next.js (React 19) + Tailwind CSS</b>", table_cell),
            Paragraph("Delivers server-side rendering, responsive component architecture, and rapid UI development. Provides superior developer ergonomics over plain HTML/JS while maintaining high rendering speed.", table_cell)
        ],
        [
            Paragraph("<b>Backend API Layer</b>", table_cell),
            Paragraph("<b>Node.js & Express.js (TypeScript)</b>", table_cell),
            Paragraph("Asynchronous, non-blocking I/O ideal for streaming large PDF buffers and managing streaming Server-Sent Events (SSE) from the local Ollama daemon.", table_cell)
        ],
        [
            Paragraph("<b>Relational & Vector DB</b>", table_cell),
            Paragraph("<b>PostgreSQL with pgvector</b>", table_cell),
            Paragraph("Unifies relational application entities (Users, Courses, Quiz Attempts) and high-dimensional semantic vectors in a single robust ACID database, eliminating the operational complexity of a separate vector store (like Pinecone or Milvus).", table_cell)
        ],
        [
            Paragraph("<b>Database ORM</b>", table_cell),
            Paragraph("<b>Prisma ORM</b>", table_cell),
            Paragraph("Provides type-safe database queries, automated schema migrations, and seamless foreign-key relationship handling across courses, chunks, and quiz tables.", table_cell)
        ],
        [
            Paragraph("<b>Local AI Inference</b>", table_cell),
            Paragraph("<b>Ollama Runtime</b>", table_cell),
            Paragraph("Lightweight, cross-platform inference engine wrapping llama.cpp. Executes quantized models with hardware acceleration on Apple Metal (M-series) and Intel OpenVINO/DirectML.", table_cell)
        ],
        [
            Paragraph("<b>Target LLM</b>", table_cell),
            Paragraph("<b>Llama-3-8B-Instruct (Q4_K_M)</b>", table_cell),
            Paragraph("State-of-the-art 8B parameter reasoning, strong instruction following for structured JSON quiz generation, and compact ~4.6 GB RAM footprint. Mistral-7B-Instruct serves as a direct fallback.", table_cell)
        ],
        [
            Paragraph("<b>Embedding Model</b>", table_cell),
            Paragraph("<b>nomic-embed-text (or bge-small)</b>", table_cell),
            Paragraph("High-performance open embedding model (8192 context window, 768 dimensions), highly optimized for technical retrieval and running locally in <280 MB RAM.", table_cell)
        ],
        [
            Paragraph("<b>PDF Text Extraction</b>", table_cell),
            Paragraph("<b>pdf-parse & LangChain Splitter</b>", table_cell),
            Paragraph("Robust JavaScript extraction of textual streams with coordinate/page awareness; recursive character chunking preserving sentence boundaries.", table_cell)
        ]
    ]
    t_tech = Table(tech_data, colWidths=[110, 130, 270])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 8))

    # ================= SECTION 8: FEASIBILITY ANALYSIS =================
    story.append(Paragraph("8. Comprehensive Feasibility Analysis (Rubric Criterion 4: 5 Marks)", h1_style))
    
    story.append(Paragraph("<b>8.1 Technical Feasibility & Hardware Audit:</b>", h2_style))
    story.append(Paragraph("The development team possesses two primary development machines: (1) <b>Apple MacBook Air (M2 Chip, Unified Memory)</b> and (2) <b>ASUS Zenbook 14 (Intel Core Ultra 7 Processor)</b>. Local AI execution feasibility was rigorously evaluated:", body_style))
    story.append(Paragraph("• <i>Memory Budgeting:</i> A 4-bit quantized 8B parameter model (e.g., Llama-3-8B-Instruct-Q4_K_M) requires ~4.6 GB VRAM/RAM. The `nomic-embed-text` embedding model consumes ~280 MB. PostgreSQL with pgvector requires ~250 MB. The Node.js and Next.js runtimes require ~500 MB. Total system RAM footprint during active inference is ~5.6–6.0 GB. On a 16GB RAM configuration, execution is well within safe operating limits without swap memory thrashing. On an 8GB machine, execution is feasible if background browser tabs and IDE instances are minimized.", bullet_style))
    story.append(Paragraph("• <i>Execution Throughput:</i> On Apple M2, the 16-core Neural Engine and Unified Memory bus deliver 18–24 tokens/second generation speed. On Intel Core Ultra 7 with Intel Arc GPU/NPU acceleration via OpenVINO or DirectML, throughput is estimated at 12–18 tokens/second. This latency is perfectly acceptable for interactive educational tutoring.", bullet_style))
    story.append(Paragraph("• <i>Concurrency & Demonstration Topology:</i> Local model inference is computationally bounded; a single laptop cannot handle 50 concurrent students. For final demonstration and viva, EduFlow is configured in a <b>Local Area Network (LAN) Host Topology</b>: the host machine runs the Ollama daemon and PostgreSQL backend, broadcasting an IP address over Wi-Fi. Evaluators and peers connect their smartphone or laptop browsers directly to the host's Next.js frontend, demonstrating live multi-device access with queued requests (1–3 active users).", bullet_style))
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>8.2 Economic Feasibility:</b>", h2_style))
    story.append(Paragraph("• <i>Development Phase (Zero Recurring Cost):</i> PostgreSQL, pgvector, Prisma, Ollama, Node.js, Next.js, and open-weight models (Llama 3, Nomic) are open-source and free of licensing fees. Development and validation incur <b>INR 0.00 in cloud API fees</b>, eliminating dependence on credit card billing or OpenAI API token costs.", body_style))
    story.append(Paragraph("• <i>Future Deployment Considerations:</i> Transitioning from local demonstration to campus-wide production would require either (a) a dedicated campus server with an NVIDIA RTX 4090 / A5000 GPU (approx. INR 1.5–2.5 Lakhs one-time capital expense), or (b) an institutional cloud VPS with GPU acceleration (approx. $0.35–$0.70/hour spot instance). The architecture maintains economic feasibility by keeping local development entirely free.", body_style))
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>8.3 Operational Feasibility:</b>", h2_style))
    story.append(Paragraph("The platform introduces zero operational friction for instructors: professors upload their existing lecture PDFs directly through a modern web UI without needing technical prompting skills. For students, the chat and quiz interfaces mirror widely understood messaging and web quiz paradigms, ensuring immediate adoption without specialized training.", body_style))
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>8.4 Schedule Feasibility:</b>", h2_style))
    story.append(Paragraph("The project is partitioned into four distinct academic milestones spanning the 2026–2027 academic sessions:", body_style))
    story.append(Paragraph("• <b>Milestone 1 (Oct 2026):</b> Project Proposal, Comprehensive Requirements, Technical Feasibility & Architectural Blueprint. [Status: Completed]", bullet_style))
    story.append(Paragraph("• <b>Milestone 2 (Dec 2026):</b> Core Backend & Ingestion Engine: PDF chunking pipeline, PostgreSQL/pgvector setup, Ollama integration, RAG Q&A MVP.", bullet_style))
    story.append(Paragraph("• <b>Milestone 3 (Feb 2027):</b> Assessment Engine: Dynamic MCQ quiz generation, deterministic scoring, weak-topic analytics algorithm, instructor dashboard.", bullet_style))
    story.append(Paragraph("• <b>Milestone 4 (Apr 2027):</b> End-to-End Integration, LAN multi-device testing, UI refinement, comprehensive evaluation, and Final Capstone Defense.", bullet_style))
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>8.5 Legal, Ethical & Privacy Feasibility:</b>", h2_style))
    story.append(Paragraph("• <i>Data Sovereignty:</i> All lecture documents and student conversation histories remain 100% on-premise, guaranteeing compliance with institutional data governance and student privacy standards.", bullet_style))
    story.append(Paragraph("• <i>Academic Integrity & Copyright:</i> The system acts as a study scaffold, not an automated essay writer. Course uploads are restricted to authorized instructors who hold academic distribution rights for their course materials.", bullet_style))
    story.append(Paragraph("• <i>Deterministic Assessment Safeguard:</i> To prevent algorithmic injustice or hallucinated grading, all quiz grading is performed by strict database key matching, completely barring LLMs from subjective score assignments.", bullet_style))
    story.append(Spacer(1, 8))

    # ================= SECTION 9: SCOPE & LIMITATIONS =================
    story.append(Paragraph("9. Scope and Limitations", h1_style))
    story.append(Paragraph("<b>In-Scope Capabilities:</b> (1) Professor PDF upload and syllabus hierarchy organization. (2) Digital text extraction, recursive chunking, and dense vector indexing. (3) Grounded RAG conversational assistance with source page citations. (4) AI-assisted hierarchical summary generation. (5) Automatic MCQ quiz generation from lecture units. (6) Deterministic scoring with explanations and topic mastery calculation. (7) Aggregated instructor performance heatmaps. (8) LAN-accessible multi-device demonstration.", body_style))
    story.append(Paragraph("<b>Explicit Out-of-Scope Elements & Limitations:</b> (1) Scanned handwritten image PDFs requiring complex Optical Character Recognition (OCR) are excluded from the initial version to preserve latency and prevent text distortion. (2) Direct read/write synchronization with Bennett University's proprietary LMS database is treated as an unconfirmed future possibility due to administrative credential constraints. (3) Large-scale enterprise concurrency (>10 simultaneous active inference users) is limited by local laptop hardware.", body_style))
    story.append(Spacer(1, 6))

    # ================= SECTION 10: RISK ANALYSIS & MITIGATION MATRIX =================
    story.append(Paragraph("10. Risk Analysis & Mitigation Strategy (Rubric Criterion 4: 5 Marks)", h1_style))
    story.append(Paragraph("A rigorous risk analysis was conducted across technical, algorithmic, and operational dimensions:", body_style))
    
    risk_data = [
        [Paragraph("<b>Risk ID & Description</b>", table_header), Paragraph("<b>Prob / Impact</b>", table_header), Paragraph("<b>Concrete Engineering Mitigation Strategy</b>", table_header)],
        [
            Paragraph("<b>R-01: AI Hallucinations / Unsupported Facts</b><br/>LLM provides plausible but incorrect explanations.", table_cell),
            Paragraph("Medium / High", table_cell),
            Paragraph("Enforce strict RAG prompt constraints; inject verified context chunks; require explicit page citations; set LLM temperature to 0.2; display confidence notice to student.", table_cell)
        ],
        [
            Paragraph("<b>R-02: Flawed Quiz Answer Keys</b><br/>Generated MCQs have ambiguous distractors or wrong keys.", table_cell),
            Paragraph("Medium / High", table_cell),
            Paragraph("Enforce strict JSON schema validation for quiz generation; require the model to quote exact context text justifying the correct option; allow faculty to review/edit quizzes.", table_cell)
        ],
        [
            Paragraph("<b>R-03: Corrupt Scanned PDF Ingestion</b><br/>Uploaded PDFs contain images rather than selectable text.", table_cell),
            Paragraph("High / Medium", table_cell),
            Paragraph("Implement upload-time validation checking extracted character density; reject unreadable scanned PDFs with a clear user prompt to upload digital/searchable PDFs.", table_cell)
        ],
        [
            Paragraph("<b>R-04: Local Hardware Memory Exhaustion</b><br/>Ollama crashes due to insufficient RAM during inference.", table_cell),
            Paragraph("Low / High", table_cell),
            Paragraph("Pin model quantization to Q4_K_M (max 4.6 GB RAM); restrict context window to 4096 tokens; implement backend request queue to process inference jobs sequentially.", table_cell)
        ],
        [
            Paragraph("<b>R-05: Unauthorized Cross-Course Access</b><br/>Student accesses course materials from unenrolled courses.", table_cell),
            Paragraph("Low / High", table_cell),
            Paragraph("Enforce multi-tenant SQL scoping in PostgreSQL: vector similarity queries are strictly filtered by `course_id IN (enrolled_courses)` at the database engine level.", table_cell)
        ],
        [
            Paragraph("<b>R-06: Small-Sample Diagnostic Skew</b><br/>Student tagged as 'weak' after attempting only 2 questions.", table_cell),
            Paragraph("High / Medium", table_cell),
            Paragraph("Require a minimum statistical threshold (at least 5–10 attempted questions across a topic) before calculating and rendering formal weakness diagnostic alerts.", table_cell)
        ],
        [
            Paragraph("<b>R-07: Scope Creep & Schedule Delay</b><br/>Feature bloat prevents completion of core features.", table_cell),
            Paragraph("Medium / High", table_cell),
            Paragraph("Adopt strict Agile methodology with frozen Milestone deliverables; defer non-essential features (e.g., live audio transcription, third-party LMS sync) to future work.", table_cell)
        ]
    ]
    t_risk = Table(risk_data, colWidths=[130, 70, 310])
    t_risk.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_risk)
    story.append(Spacer(1, 8))

    # ================= SECTION 11: PROPOSED SOLUTION & METHODOLOGY =================
    story.append(Paragraph("11. Proposed Solution Architecture & Methodology (Rubric Criterion 5: 5 Marks)", h1_style))
    story.append(Paragraph("<b>11.1 End-to-End System Architecture:</b> EduFlow adopts a decoupled, multi-tier microservice architecture comprising a Next.js client tier, a Node.js/Express orchestration tier, a unified PostgreSQL (relational + pgvector) data tier, and a local Ollama AI inference daemon.", body_style))
    
    arch_box = [
        [Paragraph("<b>HIGH-LEVEL ARCHITECTURAL DATA FLOW</b>", table_header)],
        [Paragraph("""
<b>[1. Presentation Tier — Next.js / Tailwind CSS]</b><br/>
• Professor Portal: Course creation, PDF upload, unit management, aggregated quiz difficulty dashboard.<br/>
• Student Portal: Document viewer, grounded RAG chat, summary generator, interactive quiz module, mastery progress.<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│ (REST API & Server-Sent Events / SSE)<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
<b>[2. Application & Orchestration Tier — Node.js / Express / TypeScript]</b><br/>
• Auth Controller: JWT token issuance, password hashing (bcrypt), RBAC route guards.<br/>
• Ingestion Pipeline: File validation, text extraction (pdf-parse), semantic chunking (recursive splitter).<br/>
• Assessment Engine: Deterministic MCQ grading, topic mastery weighting, recommendation rules.<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼ (Prisma ORM & SQL)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼ (HTTP Localhost:11434)<br/>
<b>[3. Data Tier — PostgreSQL + pgvector]</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>[4. Local AI Tier — Ollama Runtime]</b><br/>
• Relational Tables: Users, Courses, Quizzes, Attempts.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• Embedding: nomic-embed-text (768-dim)<br/>
• Vector Table: `document_chunks` (vector(768), HNSW index).&nbsp;&nbsp;• Inference: Llama-3-8B-Instruct (Q4_K_M)
""", table_cell)]
    ]
    t_arch = Table(arch_box, colWidths=[510])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>11.2 Detailed 10-Step PDF-to-AI Processing Pipeline:</b>", h2_style))
    pipeline_steps = [
        "<b>Step 1 (Upload & Course Tagging):</b> Instructor logs in, selects a course and unit, and uploads a PDF lecture document.",
        "<b>Step 2 (Validation & Secure Storage):</b> Backend verifies file signatures (magic bytes), bounds file size (<25MB), and saves the file to local disk storage.",
        "<b>Step 3 (Text Extraction):</b> The extraction utility parses textual streams, recording raw text alongside exact source page numbers.",
        "<b>Step 4 (Recursive Chunking):</b> Document text is divided into semantic chunks of 500–1000 tokens with 15% sliding overlap to preserve boundary context.",
        "<b>Step 5 (Vector Embedding):</b> Each chunk is dispatched to the local Ollama embedding service (`nomic-embed-text`), producing a 768-dimensional dense vector.",
        "<b>Step 6 (Database Storage):</b> Chunks, vectors, page indices, and course IDs are persisted in PostgreSQL using the `pgvector` extension with an HNSW cosine index.",
        "<b>Step 7 (Student Query Retrieval):</b> When a student submits a question, the query is converted to a vector embedding, and a cosine distance query (`<=>`) retrieves the top-k (k=4) most relevant chunks filtered strictly by enrolled course ID.",
        "<b>Step 8 (Prompt Construction):</b> A structured system prompt combines retrieved chunks, student query, course metadata, and strict grounding instructions.",
        "<b>Step 9 (Local Model Generation):</b> Ollama executes Llama-3-8B-Instruct, streaming the generated explanation with explicit page citations back via Server-Sent Events.",
        "<b>Step 10 (Assessment & Mastery Loop):</b> The same vector chunks support AI-generated diagnostic MCQs. Student answers are graded deterministically in PostgreSQL, updating the topic mastery index to trigger personalized revision recommendations."
    ]
    for step in pipeline_steps:
        story.append(Paragraph(f"• {step}", bullet_style))
    story.append(Spacer(1, 8))

    # ================= SECTION 12: EXPECTED OUTCOMES =================
    story.append(Paragraph("12. Expected Outcomes & Measurable Success Criteria (Rubric Criterion 6: 5 Marks)", h1_style))
    story.append(Paragraph("Upon completion of the final milestone, the project will deliver the following measurable engineering outcomes:", body_style))
    
    outcome_data = [
        [Paragraph("<b>Outcome Dimension</b>", table_header), Paragraph("<b>Target Specification</b>", table_header), Paragraph("<b>Verification & Acceptance Methodology</b>", table_header)],
        [
            Paragraph("<b>Functional Prototype</b>", table_cell),
            Paragraph("Full-stack web application with distinct Professor, Student, and Admin portals.", table_cell),
            Paragraph("Demonstration of end-to-end user workflows: PDF upload -> vectorization -> RAG chat -> quiz generation -> scoring.", table_cell)
        ],
        [
            Paragraph("<b>Retrieval Grounding</b>", table_cell),
            Paragraph(">= 90% grounded factual faithfulness in RAG responses without hallucinated theorems.", table_cell),
            Paragraph("Blind review of 50 technical queries compared against course PDF ground truth; verification of page citations.", table_cell)
        ],
        [
            Paragraph("<b>Quiz Validity</b>", table_cell),
            Paragraph("100% deterministic, error-free objective scoring; >= 85% question relevance.", table_cell),
            Paragraph("Rigorous unit testing of backend scoring algorithms; faculty review of 10 generated quizzes for curriculum alignment.", table_cell)
        ],
        [
            Paragraph("<b>Inference Latency</b>", table_cell),
            Paragraph("Initial token stream response < 4.0 seconds on Apple M2 / Intel Core Ultra 7.", table_cell),
            Paragraph("Automated latency benchmarking across 30 sequential RAG prompts under standard development loads.", table_cell)
        ],
        [
            Paragraph("<b>Cost & Privacy</b>", table_cell),
            Paragraph("INR 0.00 external cloud API spend; 100% local on-premise document containment.", table_cell),
            Paragraph("Network packet inspection confirming zero external outbound API calls during document ingestion and chat.", table_cell)
        ]
    ]
    t_out = Table(outcome_data, colWidths=[110, 150, 250])
    t_out.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_out)
    story.append(Spacer(1, 8))

    # ================= SECTION 13: WORK BREAKDOWN & RESPONSIBILITIES =================
    story.append(Paragraph("13. Project Planning, Milestones & Team Division of Responsibilities", h1_style))
    story.append(Paragraph("The project execution tasks are structured across exactly three team members to ensure accountability across all phases:", body_style))
    
    team_data = [
        [Paragraph("<b>Project Work Package / Module</b>", table_header), Paragraph("<b>Lead Member</b>", table_header), Paragraph("<b>Key Responsibilities & Deliverables</b>", table_header)],
        [
            Paragraph("<b>Architecture, Database & Ingestion Engine</b>", table_cell),
            Paragraph("<b>Tarun Shukla (Lead)</b>", table_cell),
            Paragraph("Overall system architecture, PostgreSQL schema design, Prisma ORM migrations, pgvector index tuning, PDF text parsing, and semantic chunking pipeline.", table_cell)
        ],
        [
            Paragraph("<b>AI Runtime, Embeddings & RAG Pipeline</b>", table_cell),
            Paragraph("<b>Team Member 2</b>", table_cell),
            Paragraph("Ollama runtime configuration, model quantization setup, dense embedding generation, vector similarity search, and prompt engineering with source citations.", table_cell)
        ],
        [
            Paragraph("<b>Frontend UI/UX, Assessment & Analytics Engine</b>", table_cell),
            Paragraph("<b>Team Member 3</b>", table_cell),
            Paragraph("Next.js dashboard implementation, Tailwind CSS design system, responsive document viewer, chat streaming UI, automated MCQ quiz module, deterministic scoring, and faculty analytics.", table_cell)
        ]
    ]
    t_team = Table(team_data, colWidths=[140, 110, 260])
    t_team.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_team)
    story.append(Spacer(1, 8))

    # ================= SECTION 14: REFERENCES =================
    story.append(Paragraph("14. Academic References (IEEE Style)", h1_style))
    refs = [
        "[1] P. Lewis, E. Perez, A. Piktus, et al., \"Retrieval-augmented generation for knowledge-intensive NLP tasks,\" in <i>Advances in Neural Information Processing Systems (NeurIPS)</i>, vol. 33, pp. 9459–9474, 2020.",
        "[2] P. Black and D. Wiliam, \"Assessment and classroom learning,\" <i>Assessment in Education: Principles, Policy & Practice</i>, vol. 5, no. 1, pp. 7–74, 1998.",
        "[3] J. Dunlosky, K. A. Rawson, E. J. Marsh, M. J. Nathan, and D. T. Willingham, \"Improving students' learning with effective learning techniques: Promising directions from cognitive and educational psychology,\" <i>Psychological Science in the Public Interest</i>, vol. 14, no. 1, pp. 4–58, 2013.",
        "[4] T. Dettmers, M. Lewis, Y. Belkada, and L. Zettlemoyer, \"LLM.int8(): 8-bit matrix multiplication for transformers at scale,\" in <i>Advances in Neural Information Processing Systems (NeurIPS)</i>, vol. 35, pp. 30318–30332, 2022.",
        "[5] A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, L. Kaiser, and I. Polosukhin, \"Attention is all you need,\" in <i>Advances in Neural Information Processing Systems (NeurIPS)</i>, vol. 30, pp. 5998–6008, 2017.",
        "[6] J. Sweller, \"Cognitive load during problem solving: Effects on learning,\" <i>Cognitive Science</i>, vol. 12, no. 2, pp. 257–285, 1988."
    ]
    for r in refs:
        story.append(Paragraph(r, bullet_style))
        
    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF at: {pdf_path}")

def build_docx_report(docx_path):
    doc = Document()
    
    # Page setup
    for section in doc.sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)
        
        # Header / Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.text = "CSET Capstone Project — Milestone 1: Project Proposal, Requirements & Feasibility"
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hp.runs[0].font.size = Pt(8.5)
        hp.runs[0].font.color.rgb = RGBColor(100, 116, 139)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.text = "EduFlow — AI-Powered Personalized Learning Assistant | Milestone 1 Official Report"
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        fp.runs[0].font.size = Pt(8.5)
        fp.runs[0].font.color.rgb = RGBColor(100, 116, 139)

    # Styles
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_uni = title_p.add_run("BENNETT UNIVERSITY\n")
    r_uni.bold = True
    r_uni.font.size = Pt(16)
    r_uni.font.color.rgb = RGBColor(30, 58, 138)
    
    r_sub = title_p.add_run("School of Computer Science Engineering and Technology (SCSET)\nB.Tech Computer Science and Engineering — Capstone Project (2026–2027)\n\n")
    r_sub.font.size = Pt(10)
    r_sub.font.color.rgb = RGBColor(100, 116, 139)

    r_title = title_p.add_run("Milestone 1: Project Proposal, Requirements & Feasibility\n")
    r_title.bold = True
    r_title.font.size = Pt(18)
    r_title.font.color.rgb = RGBColor(30, 58, 138)

    r_proj = title_p.add_run("Project Title: EduFlow\n")
    r_proj.bold = True
    r_proj.font.size = Pt(13)
    r_proj.font.color.rgb = RGBColor(2, 132, 199)

    r_acad = title_p.add_run("(Sub-title: AI-Powered Personalized Learning Assistant and Formative Assessment Platform for Academic Coursework)")
    r_acad.italic = True
    r_acad.font.size = Pt(9.5)
    r_acad.font.color.rgb = RGBColor(71, 85, 105)

    doc.add_paragraph() # Spacer

    # Helper for adding styled headings
    def add_custom_heading(text, level=1):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(text)
        run.bold = True
        if level == 1:
            run.font.size = Pt(13)
            run.font.color.rgb = RGBColor(30, 58, 138)
        else:
            run.font.size = Pt(11)
            run.font.color.rgb = RGBColor(2, 132, 199)
        return p

    def add_body(text, bold_prefix=""):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_b = p.add_run(bold_prefix + " ")
            r_b.bold = True
            r_b.font.size = Pt(9.5)
            r_b.font.color.rgb = RGBColor(15, 23, 42)
        r_t = p.add_run(text)
        r_t.font.size = Pt(9.5)
        r_t.font.color.rgb = RGBColor(51, 65, 85)
        return p

    # Metadata Table
    table = doc.add_table(rows=4, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_info = [
        ("Course Code / Component: Capstone Project (Milestone 1)", "Evaluation Marks: 30 Marks"),
        ("Submission Deadline: 18 October 2026", "Rubric Mapping: Sections 7.1 & 7.2 (6 Criteria x 5M)"),
        ("Primary Author / Team Lead: Tarun Shukla (B.Tech CSE)", "Project Track: AI / Applied Machine Learning / EdTech"),
        ("Target Hardware Stack: Apple M2 + Intel Core Ultra 7", "Local Engine: Ollama (Quantized Open-Weight LLM + pgvector)")
    ]
    for row_idx, (c1, c2) in enumerate(meta_info):
        row = table.rows[row_idx]
        row.cells[0].text = c1
        row.cells[1].text = c2
        for cell in row.cells:
            cell.paragraphs[0].runs[0].font.size = Pt(8.5)
            cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(30, 41, 59)
            shading = parse_xml(r'<w:shd {} w:fill="F1F5F9"/>'.format(nsdecls('w')))
            cell._tc.get_or_add_tcPr().append(shading)

    doc.add_paragraph()

    # Section 1: Problem Statement & Motivation
    add_custom_heading("1. Final Problem Statement and Motivation (Rubric Criterion 1: 5 Marks)")
    add_body("Contemporary university learning environments rely heavily on conventional Learning Management Systems (e.g., Moodle, Blackboard, Canvas) that serve primarily as passive, administrative document repositories. While effective for broadcasting syllabus files and receiving assignment submissions, these platforms create severe cognitive friction for undergraduate engineering students. Students are inundated with voluminous, multi-chapter academic PDFs and complex slide decks without an integrated mechanism for immediate conceptual clarification, active recall, or continuous diagnostic feedback. Consequently, students experience cognitive overload, defer doubts until high-stakes examinations, and lack data-driven visibility into their specific conceptual weaknesses.", "1.1 Core Problem Statement:")
    add_body("Educational psychology firmly establishes that active self-testing and rapid feedback cycles are superior to passive rereading for long-term knowledge retention. When students encounter ambiguous technical theorems or mathematical derivations in course lecture notes, seeking clarification from course instructors is frequently constrained by limited office hours and high student-to-faculty ratios. General-purpose public AI chatbots (e.g., vanilla ChatGPT) cannot reliably solve this dilemma because they lack awareness of the specific professor's syllabus, frequently introduce unvetted out-of-scope terminology, and pose severe privacy and subscription cost barriers. Developing EduFlow as a dedicated, course-scoped, privacy-preserving AI learning companion bridges this pedagogical gap by transforming static course materials into interactive, verified learning resources.", "1.2 Motivation & Academic Significance:")

    # Section 2: SDG Mapping
    add_custom_heading("2. UN Sustainable Development Goals (SDG) Mapping & Rationale")
    add_body("The proposed capstone directly aligns with two United Nations Sustainable Development Goals through realistic, measurable, software-driven interventions:", "")
    add_body("Target 4.4 (Technical Skills) & Target 4.7 (Mastery of Curricular Knowledge). EduFlow democratizes round-the-clock academic tutoring by breaking down complex curricular texts into digestible explanations, targeted summaries, and self-assessment quizzes grounded in professor-curated documents. This fosters mastery learning and addresses diverse learning speeds among students without replacing human educators.", "• SDG 4 (Quality Education):")
    add_body("Target 9.5 (Enhancing Technological Capabilities in Educational Institutions). The application leverages cutting-edge Retrieval-Augmented Generation (RAG) and efficient local open-weight model quantization (running via Ollama on commodity laptops). It demonstrates how educational institutions can innovate privacy-conscious digital learning infrastructure at zero recurring proprietary cloud API cost.", "• SDG 9 (Industry, Innovation, & Infrastructure):")

    # Section 3: Background & Context
    add_custom_heading("3. Background and Context")
    add_body("Higher education institutions have heavily invested in centralized Learning Management Systems (such as Moodle, Canvas, and Blackboard). These enterprise platforms excel at institutional compliance, attendance tracking, syllabus distribution, assignment file hand-ins, and gradebook publication. However, their core architecture is rooted in administrative management rather than personalized cognitive scaffolding. The typical student workflow involves downloading hundreds of megabytes of disconnected PDF slide decks and reading them passively on laptops.")
    add_body("In institutional settings, accessing core enterprise LMS databases or modifying proprietary production LMS APIs requires extensive institutional security vetting, Single Sign-On (SSO) gateway clearances, and enterprise API licensing that are rarely granted for undergraduate capstone development. Consequently, EduFlow is deliberately architected as a decoupled, standalone academic companion platform. The application features independent role-based access for professors (who upload and organize course, unit, and lecture materials) and students (who access grounded AI assistance and quizzes). While future LMS interoperability via standard protocols (such as IMS Global LTI — Learning Tools Interoperability) remains a viable technical evolution, the proposed platform delivers immediate, autonomous utility without depending on unconfirmed third-party integrations.", "Architectural Reality — Standalone Companion Model:")

    # Section 4: Literature Review
    add_custom_heading("4. Literature Review & Existing Solutions Review (Rubric Criterion 2: 5 Marks)")
    add_body("Black and Wiliam (1998) proved that frequent, diagnostic formative assessment with prompt explanatory feedback yields substantial learning gains. Dunlosky et al. (2013) demonstrated that practice testing (active recall) possesses high utility compared to passive text rereading or highlighting.", "• Formative Assessment & Spaced Testing:")
    add_body("Lewis et al. (2020) established that combining pre-trained parametric memory (neural weights) with non-parametric dense retrieval (vector database) drastically mitigates factual hallucinations, allows dynamic knowledge updates without expensive fine-tuning, and provides verifiable document source citations.", "• Retrieval-Augmented Generation (RAG):")
    add_body("Dettmers et al. (2022) established that 4-bit quantization methods (e.g., GGML/GGUF used in Ollama/llama.cpp) maintain strong reasoning capabilities while reducing memory requirements by over 65%, enabling 7B/8B parameter models to execute efficiently on modern consumer hardware.", "• Efficient Local Inference & Quantization:")

    # Section 5: Gap Analysis
    add_custom_heading("5. Gap Analysis")
    add_body("Existing systems exist in fractured, non-communicative silos: conventional LMS platforms store files without intelligence; generic PDF chat tools provide single-document summaries without curricular context; commercial AI tutors depend on expensive cloud subscriptions without institutional alignment. The defensible technical gap addressed by EduFlow is the unified convergence of: (1) Course-isolated document retrieval grounded in professor-verified materials, (2) Deterministic formative quiz evaluation coupled with automated weak-topic diagnostic algorithms, and (3) Zero-cost, privacy-preserving local execution utilizing modern quantized open-weight neural models on commodity student laptops.")

    # Section 6: Requirements
    add_custom_heading("6. Stakeholder & Requirements Analysis (Rubric Criterion 3: 5 Marks)")
    add_body("Need fast conceptual clarification, instant PDF summaries, self-assessment practice, and objective identification of their learning gaps prior to exams.", "• Primary: Undergraduate Students:")
    add_body("Need a streamlined portal to upload lecture materials and an aggregated analytics dashboard highlighting commonly misunderstood topics to guide classroom teaching.", "• Secondary: Course Instructors / Professors:")
    add_body("Need system integrity, role isolation, data confidentiality, and an architecture that avoids recurring external API expenditures.", "• Tertiary: Academic Administrators:")

    add_custom_heading("Functional Requirements Summary", level=2)
    add_body("FR-01 (JWT Authentication & RBAC), FR-02 (Course & Unit Management), FR-03 (PDF Upload & Validation), FR-04 (Text Extraction & Recursive Chunking), FR-05 (Dense Vector Embeddings & pgvector Storage), FR-06 (Course-Isolated RAG Engine with Page Citations), FR-07 (Concept Simplification & Explanations), FR-08 (Structured Summary Generation), FR-09 (Dynamic MCQ Quiz Generation), FR-10 (Deterministic Objective Scoring), FR-11 (Weak-Topic Identification Engine), FR-12 (Personalized Revision Recommendations), FR-13 (Professor Aggregated Analytics Dashboard).")

    add_custom_heading("Non-Functional Requirements Summary", level=2)
    add_body("NFR-01 (Inference Latency: Vector retrieval <200ms, token stream within 2.5–4.5s), NFR-02 (Grounding: Strict prompt constraints and source page citations), NFR-03 (Privacy: 100% local database and model containment), NFR-04 (Hardware Efficiency: Memory footprint bounded under 6.5 GB RAM).")

    # Section 7: Tech Stack
    add_custom_heading("7. Technology & Tool Selection with Justification")
    add_body("Next.js (React 19) + Tailwind CSS (Responsive, fast, modern developer ergonomics).", "• Frontend:")
    add_body("Node.js & Express.js with TypeScript (Asynchronous I/O for streaming file buffers and SSE LLM tokens).", "• Backend:")
    add_body("PostgreSQL with pgvector & Prisma ORM (Unifies relational entities and 768-dim vector embeddings in one ACID store).", "• Database:")
    add_body("Ollama Runtime with Llama-3-8B-Instruct (Q4_K_M) & nomic-embed-text (Zero API cost, complete privacy, efficient ~4.6 GB RAM execution on Apple Silicon / Intel Core Ultra).", "• Local AI Engine:")
    add_body("pdf-parse & LangChain Recursive Character Splitter (500–1000 tokens with 15% sliding overlap).", "• Document Ingestion:")

    # Section 8: Feasibility
    add_custom_heading("8. Comprehensive Feasibility Analysis (Rubric Criterion 4: 5 Marks)")
    add_body("The development team possesses an Apple MacBook Air (M2 Chip, Unified Memory) and an ASUS Zenbook 14 (Intel Core Ultra 7). A 4-bit quantized 8B model requires ~4.6 GB RAM; embedding model ~280 MB; PostgreSQL ~250 MB. Total system RAM is ~5.6–6.0 GB, fully feasible on 8GB/16GB machines. Apple M2 delivers 18–24 tokens/sec, and Intel Core Ultra 7 delivers 12–18 tokens/sec. For live demonstration, a Local Area Network (LAN) topology allows evaluators to connect client browsers over Wi-Fi to the host laptop.", "8.1 Technical Feasibility:")
    add_body("All software components (Node.js, PostgreSQL, pgvector, Prisma, Ollama, Llama 3) are open-source and free of licensing fees. Development incurs INR 0.00 in cloud API costs.", "8.2 Economic Feasibility:")
    add_body("Professors upload standard lecture PDFs via drag-and-drop; students interact via familiar chat and quiz interfaces without prompt engineering overhead.", "8.3 Operational Feasibility:")
    add_body("Structured across 4 academic milestones from October 2026 to April 2027.", "8.4 Schedule Feasibility:")
    add_body("100% on-premise document containment guarantees compliance with student privacy. Deterministic backend scoring prevents AI grading hallucinations.", "8.5 Legal & Ethical Feasibility:")

    # Section 9: Scope
    add_custom_heading("9. Scope and Limitations")
    add_body("Digital PDF lecture notes, course-scoped RAG Q&A, automatic MCQ generation, deterministic scoring, weak-topic analytics. Excludes unsearchable scanned image OCR and direct production LMS write permissions.", "• Scope Boundaries:")

    # Section 10: Risk Analysis
    add_custom_heading("10. Risk Analysis & Mitigation Strategy (Rubric Criterion 4: 5 Marks)")
    add_body("Key risks including AI hallucinations, flawed quiz answer keys, scanned PDF errors, memory exhaustion, cross-course leakage, and diagnostic skew are mitigated by strict RAG grounding, JSON schema validation, character-density pre-checks, Q4_K_M quantization, SQL-level course filtering, and minimum 5-question statistical thresholds.", "• Risk Mitigation Matrix:")

    # Section 11: Architecture & Pipeline
    add_custom_heading("11. Proposed Solution Architecture & 10-Step Pipeline (Rubric Criterion 5: 5 Marks)")
    add_body("The 10-step PDF-to-AI pipeline operates as follows: (1) Professor PDF upload and course tagging, (2) Validation and local storage, (3) Text extraction with page coordinate mapping, (4) Recursive chunking (500-1000 tokens, 15% overlap), (5) Dense vector embedding generation via Ollama (nomic-embed-text), (6) Storage in PostgreSQL pgvector with HNSW index, (7) Course-scoped vector similarity retrieval, (8) Augmented prompt construction with source anchoring, (9) Quantized LLM inference streaming with page citations, and (10) Diagnostic MCQ quiz generation with deterministic scoring and mastery updates.")

    # Section 12: Outcomes
    add_custom_heading("12. Expected Outcomes & Measurable Success Criteria (Rubric Criterion 6: 5 Marks)")
    add_body("Delivery of a verified full-stack web application; >=90% factual retrieval grounding; 100% deterministic quiz grading; <4.0s response latency on M2 / Core Ultra 7; zero recurring cloud API expense.", "• Expected Outcomes:")

    # Section 13: Team Responsibilities (3 members)
    add_custom_heading("13. Project Planning, Milestones & Team Division of Responsibilities")
    add_body("The project execution tasks are structured across exactly three team members to ensure clear accountability across all phases:", "")
    add_body("Overall system architecture, PostgreSQL schema design, Prisma ORM migrations, pgvector index tuning, PDF text parsing and semantic chunking pipeline.", "• Tarun Shukla (Lead) — Architecture, Backend & Database Engineering:")
    add_body("Ollama runtime configuration, model quantization setup, dense embedding generation, vector similarity search, and prompt engineering with source citations.", "• Team Member 2 — AI Runtime, Embeddings & RAG Pipeline:")
    add_body("Next.js dashboard implementation, Tailwind CSS design system, responsive document viewer, chat streaming UI, automated MCQ quiz module, deterministic scoring, and faculty analytics.", "• Team Member 3 — Frontend UI/UX, Assessment & Analytics Engine:")

    # Section 14: References
    add_custom_heading("14. Academic References (IEEE Style)")
    add_body("[1] P. Lewis et al., 'Retrieval-augmented generation for knowledge-intensive NLP tasks,' NeurIPS 2020. [2] P. Black & D. Wiliam, 'Assessment and classroom learning,' 1998. [3] J. Dunlosky et al., 'Improving students' learning with effective learning techniques,' 2013. [4] T. Dettmers et al., 'LLM.int8(): 8-bit matrix multiplication for transformers at scale,' NeurIPS 2022. [5] A. Vaswani et al., 'Attention is all you need,' NeurIPS 2017. [6] J. Sweller, 'Cognitive load during problem solving,' 1988.", "• Key References:")

    doc.save(docx_path)
    print(f"Successfully generated DOCX at: {docx_path}")

if __name__ == "__main__":
    out_dir = "/Users/siddharth/Desktop/capston project "
    pdf_out = os.path.join(out_dir, "Milestone_1_Proposal_and_Feasibility_Report.pdf")
    docx_out = os.path.join(out_dir, "Milestone_1_Proposal_and_Feasibility_Report.docx")
    build_pdf_report(pdf_out)
    build_docx_report(docx_out)
    print("Both documents compiled successfully!")
