-- ===============================================================
-- VETCMS Supabase All-in-One Database Initialization Script
-- Contains: 39 Tables, Indexes, Constraints, and Seed Data
-- ===============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer,
    user_name text NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id integer,
    details text,
    ip_address text,
    user_agent text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.activity_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    owner_id integer NOT NULL,
    date text NOT NULL,
    "time" text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    notes text,
    duration_minutes integer DEFAULT 30,
    is_follow_up text DEFAULT 'false'::text,
    created_at text DEFAULT (now())::text
);


--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.appointments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.appointments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: blood_smear_pathogens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blood_smear_pathogens (
    id integer NOT NULL,
    species text NOT NULL,
    name text NOT NULL
);


--
-- Name: blood_smear_pathogens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blood_smear_pathogens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blood_smear_pathogens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blood_smear_pathogens_id_seq OWNED BY public.blood_smear_pathogens.id;


--
-- Name: clinic_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_settings (
    id integer NOT NULL,
    setting_key text NOT NULL,
    setting_value text DEFAULT ''::text NOT NULL
);


--
-- Name: clinic_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.clinic_settings ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.clinic_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: estimate_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimate_items (
    id integer NOT NULL,
    estimate_id integer NOT NULL,
    fee_id integer,
    description text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    product_code text,
    inventory_id integer
);


--
-- Name: estimate_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.estimate_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.estimate_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: estimates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimates (
    id integer NOT NULL,
    estimate_number text NOT NULL,
    client_name text NOT NULL,
    pet_name text,
    date text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    subtotal numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    tax numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    converted_invoice_id integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: estimates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.estimates ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.estimates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id integer NOT NULL,
    category text NOT NULL,
    sub_category text NOT NULL,
    description text
);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.expense_categories ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.expense_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    date text NOT NULL,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    category text NOT NULL,
    payment_method text NOT NULL,
    notes text,
    recorded_by integer,
    tax_percentage numeric(5,2),
    tax_amount numeric(10,2),
    total_amount numeric(10,2),
    sub_category text,
    vendor_id integer,
    invoice_number text,
    attachment_url text,
    paid_by_id integer,
    voucher_number text
);


--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.expenses ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.expenses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fee_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_structures (
    id integer NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text,
    is_active text DEFAULT 'true'::text NOT NULL,
    product_code text
);


--
-- Name: fee_structures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.fee_structures ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.fee_structures_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: inventory_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_categories (
    id integer NOT NULL,
    name text NOT NULL
);


--
-- Name: inventory_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_categories_id_seq OWNED BY public.inventory_categories.id;


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id integer NOT NULL,
    name text NOT NULL,
    sku text NOT NULL,
    description text,
    category text DEFAULT 'General'::text,
    quantity integer DEFAULT 0 NOT NULL,
    min_quantity integer DEFAULT 5 NOT NULL,
    sale_price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    purchase_price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    expiry_date text,
    batch_number text,
    supplier text,
    supplier_id integer,
    last_updated text NOT NULL,
    product_id text,
    sub_category text,
    base_unit text DEFAULT 'Unit'::text,
    multi_unit jsonb,
    tax_category_id integer,
    min_selling_price numeric(10,2) DEFAULT 0,
    batch_criteria text,
    mfg_date text,
    shelf_details text,
    mrp numeric(10,2) DEFAULT 0 NOT NULL,
    product_type text DEFAULT 'Medicine'::text,
    purchase_sgst_amount numeric(10,2) DEFAULT 0,
    purchase_cgst_amount numeric(10,2) DEFAULT 0,
    sale_sgst_amount numeric(10,2) DEFAULT 0,
    sale_cgst_amount numeric(10,2) DEFAULT 0
);


--
-- Name: inventory_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.inventory_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.inventory_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: inventory_product_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_product_types (
    id integer NOT NULL,
    name text NOT NULL
);


--
-- Name: inventory_product_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_product_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_product_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_product_types_id_seq OWNED BY public.inventory_product_types.id;


--
-- Name: inventory_sub_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_sub_categories (
    id integer NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'General'::text,
    category_id integer
);


--
-- Name: inventory_sub_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.inventory_sub_categories ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.inventory_sub_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: inventory_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_units (
    id integer NOT NULL,
    name text NOT NULL
);


--
-- Name: inventory_units_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_units_id_seq OWNED BY public.inventory_units.id;


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    fee_id integer,
    description text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    product_code text,
    inventory_id integer
);


--
-- Name: invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.invoice_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.invoice_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    invoice_number text NOT NULL,
    owner_id integer NOT NULL,
    pet_id integer,
    date text NOT NULL,
    due_date text,
    status text DEFAULT 'pending'::text NOT NULL,
    subtotal numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    tax numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    created_by integer,
    billed_by integer,
    clinic_name text DEFAULT 'PetPoint Pro Veterinary Clinic'::text,
    clinic_address text,
    clinic_phone text,
    forwarded_to text,
    payment_method text,
    invoice_type text DEFAULT 'ip'::text,
    op_owner_name text,
    op_pet_name text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.invoices ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.invoices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lab_ref_ranges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_ref_ranges (
    id integer NOT NULL,
    test_id integer NOT NULL,
    species text NOT NULL,
    breed text,
    min text,
    max text,
    ref_text text
);


--
-- Name: lab_ref_ranges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_ref_ranges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_ref_ranges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_ref_ranges_id_seq OWNED BY public.lab_ref_ranges.id;


--
-- Name: lab_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_reports (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    date text NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    result text,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    file_url text,
    details jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: lab_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.lab_reports ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.lab_reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lab_test_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_categories (
    id integer NOT NULL,
    name text NOT NULL,
    description text
);


--
-- Name: lab_test_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_test_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_test_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_test_categories_id_seq OWNED BY public.lab_test_categories.id;


--
-- Name: lab_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_tests (
    id integer NOT NULL,
    category_id integer NOT NULL,
    name text NOT NULL,
    section text,
    unit text,
    sort_order integer DEFAULT 0
);


--
-- Name: lab_tests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lab_tests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lab_tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lab_tests_id_seq OWNED BY public.lab_tests.id;


--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_entries (
    id integer NOT NULL,
    date text NOT NULL,
    voucher_number text NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    party text,
    reference_type text,
    reference_id integer,
    reference_number text,
    debit_amount numeric(12,2) DEFAULT 0 NOT NULL,
    credit_amount numeric(12,2) DEFAULT 0 NOT NULL,
    payment_method text,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: ledger_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ledger_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ledger_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ledger_entries_id_seq OWNED BY public.ledger_entries.id;


--
-- Name: medical_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_records (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    appointment_id integer,
    date text NOT NULL,
    diagnosis text NOT NULL,
    treatment text NOT NULL,
    prescription text,
    veterinarian text NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: medical_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.medical_records ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.medical_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: owners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.owners (
    id integer NOT NULL,
    first_name text NOT NULL,
    last_name text,
    email text,
    phone text NOT NULL,
    address text
);


--
-- Name: owners_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.owners ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.owners_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pet_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pet_documents (
    id integer NOT NULL,
    pet_id integer NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    category text DEFAULT 'General'::text,
    notes text,
    uploaded_by integer,
    uploaded_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: pet_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pet_documents ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pet_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pets (
    id integer NOT NULL,
    name text NOT NULL,
    species text NOT NULL,
    breed text,
    age integer NOT NULL,
    weight numeric(5,2),
    gender text DEFAULT 'Male'::text NOT NULL,
    color text,
    microchip text,
    image_url text,
    owner_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    age_months integer DEFAULT 0
);


--
-- Name: pets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pets ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: public_report_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.public_report_shares (
    id integer NOT NULL,
    token text NOT NULL,
    filename text NOT NULL,
    owner_phone text,
    pet_name text,
    report_title text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: public_report_shares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.public_report_shares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: public_report_shares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.public_report_shares_id_seq OWNED BY public.public_report_shares.id;


--
-- Name: purchase_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_items (
    id integer NOT NULL,
    purchase_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    mrp numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) NOT NULL,
    unit text DEFAULT 'Unit'::text
);


--
-- Name: purchase_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.purchase_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.purchase_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id integer NOT NULL,
    purchase_order_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    mrp numeric(10,2) DEFAULT 0 NOT NULL,
    unit text DEFAULT 'Unit'::text
);


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.purchase_order_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.purchase_order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    order_number text NOT NULL,
    supplier_id integer NOT NULL,
    date text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    total_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    received_date text,
    created_by integer
);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.purchase_orders ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.purchase_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchases (
    id integer NOT NULL,
    purchase_number text NOT NULL,
    order_id integer,
    supplier_id integer NOT NULL,
    date text NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    notes text,
    reference_number text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.purchases ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.purchases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_system text DEFAULT 'false'::text NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.roles ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    sid text NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: species; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.species (
    id integer NOT NULL,
    name text NOT NULL
);


--
-- Name: species_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.species_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: species_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.species_id_seq OWNED BY public.species.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name text NOT NULL,
    contact_person text,
    email text,
    phone text NOT NULL,
    address text,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.suppliers ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.suppliers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tax_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_categories (
    id integer NOT NULL,
    name text NOT NULL,
    purchase_sgst numeric(5,2) DEFAULT 0 NOT NULL,
    sales_sgst numeric(5,2) DEFAULT 0 NOT NULL,
    purchase_cgst numeric(5,2) DEFAULT 0 NOT NULL,
    sales_cgst numeric(5,2) DEFAULT 0 NOT NULL,
    purchase_igst numeric(5,2) DEFAULT 0 NOT NULL,
    sales_igst numeric(5,2) DEFAULT 0 NOT NULL
);


--
-- Name: tax_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tax_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tax_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tax_categories_id_seq OWNED BY public.tax_categories.id;


--
-- Name: tenant_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_migrations (
    version text NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    plan text DEFAULT 'standard'::text NOT NULL,
    contact_name text,
    contact_email text,
    contact_phone text,
    address text,
    is_demo boolean DEFAULT false NOT NULL,
    demo_until timestamp without time zone,
    valid_until timestamp without time zone
);


--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tenants ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tenants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'admin'::text NOT NULL,
    permissions jsonb
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: blood_smear_pathogens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blood_smear_pathogens ALTER COLUMN id SET DEFAULT nextval('public.blood_smear_pathogens_id_seq'::regclass);


--
-- Name: inventory_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories ALTER COLUMN id SET DEFAULT nextval('public.inventory_categories_id_seq'::regclass);


--
-- Name: inventory_product_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_product_types ALTER COLUMN id SET DEFAULT nextval('public.inventory_product_types_id_seq'::regclass);


--
-- Name: inventory_units id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_units ALTER COLUMN id SET DEFAULT nextval('public.inventory_units_id_seq'::regclass);


--
-- Name: lab_ref_ranges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_ref_ranges ALTER COLUMN id SET DEFAULT nextval('public.lab_ref_ranges_id_seq'::regclass);


--
-- Name: lab_test_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_categories ALTER COLUMN id SET DEFAULT nextval('public.lab_test_categories_id_seq'::regclass);


--
-- Name: lab_tests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_tests ALTER COLUMN id SET DEFAULT nextval('public.lab_tests_id_seq'::regclass);


--
-- Name: ledger_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries ALTER COLUMN id SET DEFAULT nextval('public.ledger_entries_id_seq'::regclass);


--
-- Name: public_report_shares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_report_shares ALTER COLUMN id SET DEFAULT nextval('public.public_report_shares_id_seq'::regclass);


--
-- Name: species id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.species ALTER COLUMN id SET DEFAULT nextval('public.species_id_seq'::regclass);


--
-- Name: tax_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_categories ALTER COLUMN id SET DEFAULT nextval('public.tax_categories_id_seq'::regclass);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: blood_smear_pathogens blood_smear_pathogens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blood_smear_pathogens
    ADD CONSTRAINT blood_smear_pathogens_pkey PRIMARY KEY (id);


--
-- Name: clinic_settings clinic_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_settings
    ADD CONSTRAINT clinic_settings_pkey PRIMARY KEY (id);


--
-- Name: clinic_settings clinic_settings_setting_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_settings
    ADD CONSTRAINT clinic_settings_setting_key_unique UNIQUE (setting_key);


--
-- Name: estimate_items estimate_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_items
    ADD CONSTRAINT estimate_items_pkey PRIMARY KEY (id);


--
-- Name: estimates estimates_estimate_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_estimate_number_unique UNIQUE (estimate_number);


--
-- Name: estimates estimates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: fee_structures fee_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_pkey PRIMARY KEY (id);


--
-- Name: inventory_categories inventory_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_name_key UNIQUE (name);


--
-- Name: inventory_categories inventory_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_product_id_key UNIQUE (product_id);


--
-- Name: inventory_product_types inventory_product_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_product_types
    ADD CONSTRAINT inventory_product_types_name_key UNIQUE (name);


--
-- Name: inventory_product_types inventory_product_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_product_types
    ADD CONSTRAINT inventory_product_types_pkey PRIMARY KEY (id);


--
-- Name: inventory_sub_categories inventory_sub_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_sub_categories
    ADD CONSTRAINT inventory_sub_categories_name_key UNIQUE (name);


--
-- Name: inventory_sub_categories inventory_sub_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_sub_categories
    ADD CONSTRAINT inventory_sub_categories_pkey PRIMARY KEY (id);


--
-- Name: inventory_units inventory_units_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_units
    ADD CONSTRAINT inventory_units_name_key UNIQUE (name);


--
-- Name: inventory_units inventory_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_units
    ADD CONSTRAINT inventory_units_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: lab_ref_ranges lab_ref_ranges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_ref_ranges
    ADD CONSTRAINT lab_ref_ranges_pkey PRIMARY KEY (id);


--
-- Name: lab_reports lab_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_reports
    ADD CONSTRAINT lab_reports_pkey PRIMARY KEY (id);


--
-- Name: lab_test_categories lab_test_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_categories
    ADD CONSTRAINT lab_test_categories_pkey PRIMARY KEY (id);


--
-- Name: lab_tests lab_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_tests
    ADD CONSTRAINT lab_tests_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: medical_records medical_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_records
    ADD CONSTRAINT medical_records_pkey PRIMARY KEY (id);


--
-- Name: owners owners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owners
    ADD CONSTRAINT owners_pkey PRIMARY KEY (id);


--
-- Name: pet_documents pet_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pet_documents
    ADD CONSTRAINT pet_documents_pkey PRIMARY KEY (id);


--
-- Name: pets pets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_pkey PRIMARY KEY (id);


--
-- Name: public_report_shares public_report_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_report_shares
    ADD CONSTRAINT public_report_shares_pkey PRIMARY KEY (id);


--
-- Name: public_report_shares public_report_shares_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_report_shares
    ADD CONSTRAINT public_report_shares_token_key UNIQUE (token);


--
-- Name: purchase_items purchase_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_items
    ADD CONSTRAINT purchase_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_order_number_unique UNIQUE (order_number);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_purchase_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_purchase_number_key UNIQUE (purchase_number);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: species species_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.species
    ADD CONSTRAINT species_name_unique UNIQUE (name);


--
-- Name: species species_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.species
    ADD CONSTRAINT species_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: tax_categories tax_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_categories
    ADD CONSTRAINT tax_categories_pkey PRIMARY KEY (id);


--
-- Name: tenant_migrations tenant_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_migrations
    ADD CONSTRAINT tenant_migrations_pkey PRIMARY KEY (version);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_appointments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_date ON public.appointments USING btree (date);


--
-- Name: idx_appointments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);


--
-- Name: idx_invoices_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_date ON public.invoices USING btree (date);


--
-- Name: idx_invoices_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_owner ON public.invoices USING btree (owner_id);


--
-- Name: idx_pets_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pets_owner ON public.pets USING btree (owner_id);


--
-- Name: idx_public_report_shares_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_report_shares_token ON public.public_report_shares USING btree (token);


--
-- PostgreSQL database dump complete
--




-- ===============================================================
-- Seed Initial Data
-- ===============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: blood_smear_pathogens; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (2, 'Canine', 'Leishmania infantum');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (3, 'Canine', 'Hepatozoon americanum');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (4, 'Canine', 'Anaplasma phagocytophilum');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (5, 'Canine', 'Ehrlichia canis');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (6, 'Canine', 'Giardia duodenalis');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (7, 'Canine', 'Cystoisospora canis');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (8, 'Canine', 'Trypanosoma cruzi');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (9, 'Feline', 'Toxoplasma gondii');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (10, 'Feline', 'Cytauxzoon felis');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (11, 'Feline', 'Mycoplasma haemofelis');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (12, 'Feline', 'Babesia felis');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (13, 'Feline', 'Tritrichomonas foetus');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (14, 'Feline', 'Giardia duodenalis');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (15, 'Bovine', 'Babesia bovis / B. bigemina');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (16, 'Bovine', 'Theileria parva / T. annulata');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (17, 'Bovine', 'Trypanosoma vivax / T. congolense');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (18, 'Bovine', 'Anaplasma marginale');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (19, 'Bovine', 'Neospora caninum');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (20, 'Bovine', 'Cryptosporidium parvum');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (21, 'Caprine', 'Babesia ovis / B. motasi');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (22, 'Caprine', 'Theileria ovis / T. lestoquardi');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (23, 'Caprine', 'Trypanosoma melophagium');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (24, 'Caprine', 'Anaplasma ovis');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (25, 'Caprine', 'Eimeria arloingi / E. christenseni');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (26, 'Caprine', 'Cryptosporidium parvum');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (27, 'Equine', 'Theileria equi / Babesia caballi');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (28, 'Equine', 'Trypanosoma evansi');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (29, 'Equine', 'Sarcocystis neurona');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (30, 'Equine', 'Anaplasma phagocytophilum');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (31, 'Equine', 'Klossiella equi');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (32, 'Avian', 'Plasmodium gallinaceum');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (33, 'Avian', 'Leucocytozoon simondi');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (34, 'Avian', 'Haemoproteus columbae');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (35, 'Avian', 'Eimeria tenella / E. necatrix');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (36, 'Avian', 'Histomonas meleagridis');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (37, 'Porcine', 'Babesia trautmanni');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (38, 'Porcine', 'Trypanosoma brucei');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (39, 'Porcine', 'Isospora suis');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (40, 'Porcine', 'Cryptosporidium parvum');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (41, 'Porcine', 'Toxoplasma gondii');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (42, 'Lagomorph', 'Encephalitozoon cuniculi');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (43, 'Lagomorph', 'Eimeria stiedae');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (44, 'Lagomorph', 'Toxoplasma gondii');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (45, 'Lagomorph', 'Trypanosoma nabiasi');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (1, 'Canine', 'Babesia canis');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (46, 'Canine', 'Babesia gibsoni');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (47, 'Dog', 'Mycoplasma canis');
INSERT INTO public.blood_smear_pathogens (id, species, name) VALUES (48, 'Canine', 'Mycoplasma canis');


--
-- Data for Name: lab_ref_ranges; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (118, 17, 'Elephant', NULL, '1.5', '3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (12, 12, 'Dog', NULL, '2', '10', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (13, 13, 'Dog', NULL, '0', '1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (125, 19, 'Elephant', NULL, '60', '450', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (133, 29, 'Elephant', NULL, '4', '35', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (139, 23, 'Elephant', NULL, '0.2', '1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (146, 20, 'Elephant', NULL, '5.2', '10', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (90, 10, 'Elephant', NULL, NULL, NULL, '27%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (91, 10, 'Rabbit', NULL, NULL, NULL, '34%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (34, 2, 'Elephant', NULL, '9.6', '15.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (111, 18, 'Elephant', NULL, '15', '35', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (112, 18, 'Rabbit', NULL, '0', '47', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (48, 1, 'Elephant', NULL, '2.1', '3.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (467, 5, 'Dog', '', '134', '396', '');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (126, 19, 'Rabbit', NULL, '0', '120', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (62, 7, 'Elephant', NULL, '42', '57', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (69, 8, 'Elephant', NULL, '33.4', '35.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (140, 23, 'Rabbit', NULL, '0', '0.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (76, 4, 'Elephant', NULL, '8.6', '18.2', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (105, 5, 'Rabbit', NULL, '2', '10.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (21, 21, 'Dog', NULL, '2.6', '3.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (83, 9, 'Elephant', NULL, NULL, NULL, '23%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (97, 11, 'Elephant', NULL, NULL, NULL, '50%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (55, 6, 'Elephant', NULL, '111', '138', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (20, 20, 'Dog', NULL, '5.4', '7.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (25, 25, 'Dog', NULL, '4.4', '5.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (33, 2, 'Pig', NULL, '10', '14', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (39, 3, 'Horse', NULL, '30', '44', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (40, 3, 'Pig', NULL, '34', '44', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (42, 3, 'Rabbit', NULL, '32', '47', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (1, 1, 'Dog', NULL, '5.7', '8.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (43, 1, 'Cat', NULL, '7.4', '10.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (44, 1, 'Cow', NULL, '5.1', '7.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (45, 1, 'Goat', NULL, '8', '18', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (46, 1, 'Horse', NULL, '6.6', '11', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (47, 1, 'Pig', NULL, '6.4', '8.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (84, 9, 'Rabbit', NULL, NULL, NULL, '65%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (6, 6, 'Dog', NULL, '64', '74', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (50, 6, 'Cat', NULL, '42', '52', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (51, 6, 'Cow', NULL, '38', '50', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (52, 6, 'Goat', NULL, '16', '25', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (53, 6, 'Horse', NULL, '38', '51', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (7, 7, 'Dog', NULL, '22', '26', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (57, 7, 'Cat', NULL, '13', '17', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (58, 7, 'Cow', NULL, '14', '18', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (59, 7, 'Goat', NULL, '5.2', '8.0', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (60, 7, 'Horse', NULL, '13', '19', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (61, 7, 'Pig', NULL, '17', '21', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (98, 11, 'Rabbit', NULL, NULL, NULL, '1%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (8, 8, 'Dog', NULL, '33', '38', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (64, 8, 'Cat', NULL, '30', '33', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (65, 8, 'Cow', NULL, '36', '39', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (66, 8, 'Goat', NULL, '30', '36', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (68, 8, 'Pig', NULL, '29', '33', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (4, 4, 'Dog', NULL, '5.0', '13', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (71, 4, 'Cat', NULL, '5.4', '15.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (72, 4, 'Cow', NULL, '4.9', '12', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (73, 4, 'Goat', NULL, '4', '13', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (74, 4, 'Horse', NULL, '5.6', '11.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (75, 4, 'Pig', NULL, '15.6', '38.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (119, 17, 'Rabbit', NULL, '0', '79', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (9, 9, 'Dog', NULL, NULL, NULL, '68%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (78, 9, 'Cat', NULL, NULL, NULL, '63%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (79, 9, 'Cow', NULL, NULL, NULL, '52%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (81, 9, 'Horse', NULL, NULL, NULL, '58%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (82, 9, 'Pig', NULL, NULL, NULL, '42%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (10, 10, 'Dog', NULL, NULL, NULL, '26%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (85, 10, 'Cat', NULL, NULL, NULL, '36%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (86, 10, 'Cow', NULL, NULL, NULL, '47%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (87, 10, 'Goat', NULL, NULL, NULL, '69%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (88, 10, 'Horse', NULL, NULL, NULL, '49%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (89, 10, 'Pig', NULL, NULL, NULL, '52%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (134, 23, 'Cat', NULL, '0.15', '0.50', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (11, 11, 'Dog', NULL, NULL, NULL, '6%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (92, 11, 'Cat', NULL, NULL, NULL, '6%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (93, 11, 'Cow', NULL, NULL, NULL, '7%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (94, 11, 'Goat', NULL, NULL, NULL, '4%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (96, 11, 'Pig', NULL, NULL, NULL, '9%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (102, 5, 'Horse', NULL, '1', '3.08', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (56, 6, 'Rabbit', NULL, '52', '72', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (63, 7, 'Rabbit', NULL, '19', '24', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (70, 8, 'Rabbit', NULL, '30.5', '36.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (103, 5, 'Pig', NULL, '2.11', '8.87', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (32, 2, 'Horse', NULL, '11', '16', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (18, 18, 'Dog', NULL, '23', '66', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (106, 18, 'Cat', NULL, '26', '43', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (107, 18, 'Cow', NULL, '78', '132', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (108, 18, 'Goat', NULL, '167', '513', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (109, 18, 'Horse', NULL, '226', '366', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (110, 18, 'Pig', NULL, '32', '84', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (17, 17, 'Dog', NULL, '21', '102', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (113, 17, 'Cat', NULL, '6', '83', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (114, 17, 'Cow', NULL, '11', '40', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (115, 17, 'Goat', NULL, '6', '19', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (116, 17, 'Horse', NULL, '3', '23', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (117, 17, 'Pig', NULL, '31', '58', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (2, 2, 'Dog', NULL, '14', '20', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (19, 19, 'Dog', NULL, '20', '156', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (121, 19, 'Cow', NULL, '0', '488', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (122, 19, 'Goat', NULL, '93', '387', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (123, 19, 'Horse', NULL, '143', '395', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (124, 19, 'Pig', NULL, '118', '395', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (35, 2, 'Rabbit', NULL, '10.5', '15.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (127, 29, 'Dog', NULL, '1.2', '6.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (128, 29, 'Cat', NULL, '1.3', '5.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (129, 29, 'Cow', NULL, '6.1', '17.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (130, 29, 'Goat', NULL, '20', '56', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (131, 29, 'Horse', NULL, '4.3', '13.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (132, 29, 'Pig', NULL, '1.2', '6.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (49, 1, 'Rabbit', NULL, '4.9', '7.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (135, 23, 'Cow', NULL, '0.01', '0.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (136, 23, 'Goat', NULL, '0', '0.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (137, 23, 'Horse', NULL, '1', '2', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (138, 23, 'Pig', NULL, '0.10', '0.50', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (77, 4, 'Rabbit', NULL, '3.4', '12.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (141, 20, 'Cat', NULL, '5.4', '7.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (142, 20, 'Cow', NULL, '6.7', '7.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (143, 20, 'Goat', NULL, '6.4', '7.0', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (144, 20, 'Horse', NULL, '5.2', '7.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (145, 20, 'Pig', NULL, '7.9', '8.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (29, 2, 'Cat', NULL, '11', '16', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (148, 21, 'Cat', NULL, '2.1', '3.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (155, 22, 'Cat', NULL, '2.6', '5.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (27, 27, 'Dog', NULL, '9.0', '11.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (28, 28, 'Dog', NULL, '2.6', '6.2', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (24, 24, 'Dog', NULL, '141', '152', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (26, 26, 'Dog', NULL, '105', '115', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (30, 2, 'Cow', NULL, '8', '12', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (31, 2, 'Goat', NULL, '8', '12', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (3, 3, 'Dog', NULL, '40', '56', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (36, 3, 'Cat', NULL, '34', '51', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (37, 3, 'Cow', NULL, '22', '32', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (38, 3, 'Goat', NULL, '22', '38', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (258, 3, 'Caprine', NULL, '22', '38', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (259, 3, 'Equine', NULL, '30', '44', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (157, 22, 'Goat', NULL, '2.7', '4.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (158, 22, 'Horse', NULL, '2.62', '4.04', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (159, 22, 'Pig', NULL, '5.29', '6.43', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (255, 3, 'Canine', NULL, '40', '56', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (192, 34, 'Dog', NULL, '0', '400', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (162, 30, 'Dog', NULL, '135', '270', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (163, 30, 'Cat', NULL, '95', '130', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (164, 30, 'Cow', NULL, '8', '120', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (165, 30, 'Goat', NULL, '80', '130', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (166, 30, 'Horse', NULL, '75', '150', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (167, 30, 'Pig', NULL, '36', '54', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (256, 3, 'Feline', NULL, '34', '51', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (197, 27, 'Cat', NULL, '6.2', '10.2', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (170, 31, 'Dog', NULL, '20', '112', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (177, 16, 'Goat', NULL, '1.0', '1.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (178, 16, 'Horse', NULL, '1.2', '1.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (179, 16, 'Pig', NULL, '1', '2.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (260, 3, 'Porcine', NULL, '34', '44', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (210, 28, 'Rabbit', NULL, '0', '4.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (15, 15, 'Dog', NULL, '10', '28', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (182, 15, 'Cat', NULL, '20', '30', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (183, 15, 'Cow', NULL, '20', '30', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (184, 15, 'Goat', NULL, '10', '20', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (185, 15, 'Horse', NULL, '10', '24', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (186, 15, 'Pig', NULL, '10', '30', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (41, 3, 'Elephant', NULL, '27', '44', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (218, 35, 'Rabbit', NULL, '0', '2.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (261, 3, 'Lagomorph', NULL, '32', '47', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (189, 33, 'Dog', NULL, '13', '200', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (190, 33, 'Cat', NULL, '0', '83', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (262, 1, 'Canine', NULL, '5.7', '8.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (232, 25, 'Rabbit', NULL, '0', '5.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (198, 27, 'Cow', NULL, '9.7', '12.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (199, 27, 'Goat', NULL, '8.9', '11.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (200, 27, 'Horse', NULL, '11.2', '13.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (201, 27, 'Pig', NULL, '7.1', '11.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (263, 1, 'Feline', NULL, '7.4', '10.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (239, 26, 'Rabbit', NULL, '85', '105', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (204, 28, 'Cat', NULL, '4.5', '8.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (205, 28, 'Cow', NULL, '5.6', '6.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (206, 28, 'Goat', NULL, '4.2', '9.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (207, 28, 'Horse', NULL, '3.1', '5.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (208, 28, 'Pig', NULL, '5.3', '9.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (264, 1, 'Bovine', NULL, '5.1', '7.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (246, 14, 'Rabbit', NULL, '50', '93.2', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (211, 35, 'Dog', NULL, '1.8', '2.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (160, 22, 'Elephant', NULL, '3.7', '6.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (219, 24, 'Cat', NULL, '147', '156', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (220, 24, 'Cow', NULL, '132', '152', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (221, 24, 'Goat', NULL, '142', '155', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (222, 24, 'Horse', NULL, '132', '146', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (223, 24, 'Pig', NULL, '135', '150', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (265, 1, 'Caprine', NULL, '8', '18', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (270, 6, 'Feline', NULL, '42', '52', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (226, 25, 'Cat', NULL, '4.0', '4.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (227, 25, 'Cow', NULL, '3.9', '5.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (228, 25, 'Goat', NULL, '3.5', '6.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (229, 25, 'Horse', NULL, '2.4', '4.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (230, 25, 'Pig', NULL, '4.4', '6.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (267, 1, 'Porcine', NULL, '6.4', '8.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (271, 6, 'Bovine', NULL, '38', '50', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (233, 26, 'Cat', NULL, '117', '123', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (234, 26, 'Cow', NULL, '97', '111', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (235, 26, 'Goat', NULL, '99', '110', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (236, 26, 'Horse', NULL, '99', '109', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (237, 26, 'Pig', NULL, '94', '106', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (272, 6, 'Caprine', NULL, '16', '25', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (14, 14, 'Dog', NULL, '65', '118', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (240, 14, 'Cat', NULL, '73', '134', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (241, 14, 'Cow', NULL, '45', '75', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (242, 14, 'Goat', NULL, '50', '75', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (243, 14, 'Horse', NULL, '75', '115', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (244, 14, 'Pig', NULL, '85', '115', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (268, 1, 'Lagomorph', NULL, '4.9', '7.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (273, 6, 'Equine', NULL, '38', '51', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (269, 6, 'Canine', NULL, '64', '74', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (187, 15, 'Elephant', NULL, '5', '20', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (274, 6, 'Porcine', NULL, '49', '59', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (67, 8, 'Horse', NULL, '35', '39', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (80, 9, 'Goat', NULL, NULL, NULL, '55%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (95, 11, 'Horse', NULL, NULL, NULL, '6%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (120, 19, 'Cat', NULL, '25', '93', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (275, 6, 'Lagomorph', NULL, '52', '72', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (188, 32, 'Dog', NULL, '185', '700', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (23, 23, 'Dog', NULL, '0.10', '0.50', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (147, 20, 'Rabbit', NULL, '0', '6.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (149, 21, 'Cow', NULL, '3.03', '3.55', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (150, 21, 'Goat', NULL, '2.7', '3.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (151, 21, 'Horse', NULL, '2.6', '3.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (152, 21, 'Pig', NULL, '1.9', '3.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (154, 21, 'Rabbit', NULL, '0', '3.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (203, 27, 'Rabbit', NULL, '5.84', '14.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (22, 22, 'Dog', NULL, '2.7', '4.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (156, 22, 'Cow', NULL, '3.0', '3.48', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (171, 31, 'Cat', NULL, '10', '114', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (172, 31, 'Cow', NULL, '0', '14', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (173, 31, 'Horse', NULL, '4', '44', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (257, 3, 'Bovine', NULL, '22', '32', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (225, 24, 'Rabbit', NULL, '0', '146', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (175, 16, 'Cat', NULL, '0.8', '1.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (176, 16, 'Cow', NULL, '1.0', '2.0', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (276, 7, 'Canine', NULL, '22', '26', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (193, 34, 'Cow', NULL, '0', '2000', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (194, 34, 'Horse', NULL, '0', '2000', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (195, 34, 'Pig', NULL, '0', '2000', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (277, 7, 'Feline', NULL, '13', '17', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (212, 35, 'Cat', NULL, '1.8', '2.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (213, 35, 'Cow', NULL, '1.8', '2.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (214, 35, 'Goat', NULL, '2.8', '3.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (215, 35, 'Horse', NULL, '2.2', '2.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (216, 35, 'Pig', NULL, '2.7', '3.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (278, 7, 'Bovine', NULL, '14', '18', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (280, 7, 'Equine', NULL, '13', '19', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (281, 7, 'Porcine', NULL, '17', '21', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (282, 7, 'Lagomorph', NULL, '19', '24', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (283, 8, 'Canine', NULL, '33', '38', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (168, 30, 'Elephant', NULL, '26', '68', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (174, 31, 'Elephant', NULL, '15', '60', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (180, 16, 'Elephant', NULL, '1.1', '1.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (191, 33, 'Elephant', NULL, '10', '90', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (196, 34, 'Elephant', NULL, '0', '2000', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (54, 6, 'Pig', NULL, '49', '59', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (202, 27, 'Elephant', NULL, '9', '12', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (209, 28, 'Elephant', NULL, '4', '6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (217, 35, 'Elephant', NULL, '1.4', '2.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (224, 24, 'Elephant', NULL, '120', '140', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (231, 25, 'Elephant', NULL, '3', '6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (238, 26, 'Elephant', NULL, '100', '115', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (245, 14, 'Elephant', NULL, '60', '116', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (248, 2, 'Canine', NULL, '14', '20', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (249, 2, 'Feline', NULL, '11', '16', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (250, 2, 'Bovine', NULL, '8', '12', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (251, 2, 'Caprine', NULL, '8', '12', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (252, 2, 'Equine', NULL, '11', '16', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (253, 2, 'Porcine', NULL, '10', '14', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (254, 2, 'Lagomorph', NULL, '10.5', '15.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (161, 22, 'Rabbit', NULL, '0', '3.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (169, 30, 'Rabbit', NULL, '5.3', '71', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (16, 16, 'Dog', NULL, '0.5', '1.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (181, 16, 'Rabbit', NULL, '0.8', '2.57', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (297, 9, 'Canine', NULL, NULL, NULL, '68%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (298, 9, 'Feline', NULL, NULL, NULL, '63%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (299, 9, 'Bovine', NULL, NULL, NULL, '52%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (300, 9, 'Caprine', NULL, NULL, NULL, '55%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (301, 9, 'Equine', NULL, NULL, NULL, '58%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (302, 9, 'Porcine', NULL, NULL, NULL, '42%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (303, 9, 'Lagomorph', NULL, NULL, NULL, '65%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (304, 10, 'Canine', NULL, NULL, NULL, '26%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (305, 10, 'Feline', NULL, NULL, NULL, '36%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (306, 10, 'Bovine', NULL, NULL, NULL, '47%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (307, 10, 'Caprine', NULL, NULL, NULL, '69%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (308, 10, 'Equine', NULL, NULL, NULL, '49%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (309, 10, 'Porcine', NULL, NULL, NULL, '52%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (310, 10, 'Lagomorph', NULL, NULL, NULL, '34%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (311, 11, 'Canine', NULL, NULL, NULL, '6%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (312, 11, 'Feline', NULL, NULL, NULL, '6%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (314, 11, 'Caprine', NULL, NULL, NULL, '4%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (315, 11, 'Equine', NULL, NULL, NULL, '6%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (316, 11, 'Porcine', NULL, NULL, NULL, '9%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (317, 11, 'Lagomorph', NULL, NULL, NULL, '1%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (319, 5, 'Feline', NULL, '160', '500', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (322, 5, 'Equine', NULL, '100', '308', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (323, 5, 'Porcine', NULL, '211', '887', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (324, 5, 'Lagomorph', NULL, '200', '1060', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (325, 18, 'Canine', NULL, '23', '66', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (326, 18, 'Feline', NULL, '26', '43', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (327, 18, 'Bovine', NULL, '78', '132', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (328, 18, 'Caprine', NULL, '167', '513', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (329, 18, 'Equine', NULL, '226', '366', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (330, 18, 'Porcine', NULL, '32', '84', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (331, 18, 'Lagomorph', NULL, '0', '47', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (332, 17, 'Canine', NULL, '21', '102', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (333, 17, 'Feline', NULL, '6', '83', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (334, 17, 'Bovine', NULL, '11', '40', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (335, 17, 'Caprine', NULL, '6', '19', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (336, 17, 'Equine', NULL, '3', '23', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (337, 17, 'Porcine', NULL, '31', '58', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (338, 17, 'Lagomorph', NULL, '0', '79', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (339, 19, 'Canine', NULL, '20', '156', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (341, 19, 'Bovine', NULL, '0', '488', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (342, 19, 'Caprine', NULL, '93', '387', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (343, 19, 'Equine', NULL, '143', '395', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (344, 19, 'Porcine', NULL, '118', '395', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (345, 19, 'Lagomorph', NULL, '0', '120', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (346, 29, 'Canine', NULL, '1.2', '6.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (347, 29, 'Feline', NULL, '1.3', '5.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (348, 29, 'Bovine', NULL, '6.1', '17.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (349, 29, 'Caprine', NULL, '20', '56', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (350, 29, 'Equine', NULL, '4.3', '13.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (351, 29, 'Porcine', NULL, '1.2', '6.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (353, 23, 'Feline', NULL, '0.15', '0.50', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (354, 23, 'Bovine', NULL, '0.01', '0.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (355, 23, 'Caprine', NULL, '0', '0.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (356, 23, 'Equine', NULL, '1', '2', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (357, 23, 'Porcine', NULL, '0.10', '0.50', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (358, 23, 'Lagomorph', NULL, '0', '0.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (359, 20, 'Canine', NULL, '5.4', '7.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (360, 20, 'Feline', NULL, '5.4', '7.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (361, 20, 'Bovine', NULL, '6.7', '7.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (362, 20, 'Caprine', NULL, '6.4', '7.0', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (363, 20, 'Equine', NULL, '5.2', '7.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (364, 20, 'Porcine', NULL, '7.9', '8.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (365, 20, 'Lagomorph', NULL, '0', '6.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (366, 21, 'Canine', NULL, '2.6', '3.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (367, 21, 'Feline', NULL, '2.1', '3.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (369, 21, 'Caprine', NULL, '2.7', '3.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (370, 21, 'Equine', NULL, '2.6', '3.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (371, 21, 'Porcine', NULL, '1.9', '3.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (153, 21, 'Elephant', NULL, '1.5', '3.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (372, 21, 'Lagomorph', NULL, '0', '3.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (373, 22, 'Canine', NULL, '2.7', '4.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (374, 22, 'Feline', NULL, '2.6', '5.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (375, 22, 'Bovine', NULL, '3.0', '3.48', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (376, 22, 'Caprine', NULL, '2.7', '4.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (377, 22, 'Equine', NULL, '2.62', '4.04', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (378, 22, 'Porcine', NULL, '5.29', '6.43', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (379, 22, 'Lagomorph', NULL, '0', '3.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (380, 30, 'Canine', NULL, '135', '270', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (381, 30, 'Feline', NULL, '95', '130', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (383, 30, 'Caprine', NULL, '80', '130', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (384, 30, 'Equine', NULL, '75', '150', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (385, 30, 'Porcine', NULL, '36', '54', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (386, 30, 'Lagomorph', NULL, '5.3', '71', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (387, 31, 'Canine', NULL, '20', '112', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (388, 31, 'Feline', NULL, '10', '114', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (389, 31, 'Bovine', NULL, '0', '14', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (390, 31, 'Equine', NULL, '4', '44', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (391, 16, 'Canine', NULL, '0.5', '1.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (392, 16, 'Feline', NULL, '0.8', '1.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (393, 16, 'Bovine', NULL, '1.0', '2.0', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (394, 16, 'Caprine', NULL, '1.0', '1.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (396, 16, 'Porcine', NULL, '1', '2.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (397, 16, 'Lagomorph', NULL, '0.8', '2.57', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (398, 15, 'Canine', NULL, '10', '28', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (399, 15, 'Feline', NULL, '20', '30', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (400, 15, 'Bovine', NULL, '20', '30', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (401, 15, 'Caprine', NULL, '10', '20', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (402, 15, 'Equine', NULL, '10', '24', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (403, 15, 'Porcine', NULL, '10', '30', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (404, 32, 'Canine', NULL, '185', '700', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (405, 33, 'Canine', NULL, '13', '200', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (406, 33, 'Feline', NULL, '0', '83', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (407, 34, 'Canine', NULL, '0', '400', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (409, 34, 'Equine', NULL, '0', '2000', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (410, 34, 'Porcine', NULL, '0', '2000', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (411, 27, 'Canine', NULL, '9.0', '11.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (412, 27, 'Feline', NULL, '6.2', '10.2', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (413, 27, 'Bovine', NULL, '9.7', '12.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (414, 27, 'Caprine', NULL, '8.9', '11.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (415, 27, 'Equine', NULL, '11.2', '13.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (416, 27, 'Porcine', NULL, '7.1', '11.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (417, 27, 'Lagomorph', NULL, '5.84', '14.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (418, 28, 'Canine', NULL, '2.6', '6.2', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (419, 28, 'Feline', NULL, '4.5', '8.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (420, 28, 'Bovine', NULL, '5.6', '6.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (422, 28, 'Equine', NULL, '3.1', '5.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (423, 28, 'Porcine', NULL, '5.3', '9.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (424, 28, 'Lagomorph', NULL, '0', '4.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (425, 35, 'Canine', NULL, '1.8', '2.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (426, 35, 'Feline', NULL, '1.8', '2.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (427, 35, 'Bovine', NULL, '1.8', '2.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (428, 35, 'Caprine', NULL, '2.8', '3.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (429, 35, 'Equine', NULL, '2.2', '2.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (430, 35, 'Porcine', NULL, '2.7', '3.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (286, 8, 'Caprine', NULL, '30', '36', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (287, 8, 'Equine', NULL, '35', '39', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (288, 8, 'Porcine', NULL, '29', '33', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (289, 8, 'Lagomorph', NULL, '30.5', '36.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (290, 4, 'Canine', NULL, '5.0', '13', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (291, 4, 'Feline', NULL, '5.4', '15.4', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (292, 4, 'Bovine', NULL, '4.9', '12', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (293, 4, 'Caprine', NULL, '4', '13', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (294, 4, 'Equine', NULL, '5.6', '11.6', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (295, 4, 'Porcine', NULL, '15.6', '38.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (266, 1, 'Equine', NULL, '6.6', '11', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (279, 7, 'Caprine', NULL, '5.2', '8.0', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (284, 8, 'Feline', NULL, '30', '33', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (285, 8, 'Bovine', NULL, '36', '39', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (296, 4, 'Lagomorph', NULL, '3.4', '12.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (313, 11, 'Bovine', NULL, NULL, NULL, '7%');
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (460, 5, 'Canine', '', '134', '396', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (462, 5, 'Bovine', '', '190', '640', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (463, 5, 'Caprine', '', '300', '600', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (104, 5, 'Elephant', NULL, '340', '720', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (340, 19, 'Feline', NULL, '25', '93', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (352, 23, 'Canine', NULL, '0.10', '0.50', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (368, 21, 'Bovine', NULL, '3.03', '3.55', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (382, 30, 'Bovine', NULL, '8', '120', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (395, 16, 'Equine', NULL, '1.2', '1.9', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (408, 34, 'Bovine', NULL, '0', '2000', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (421, 28, 'Caprine', NULL, '4.2', '9.1', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (431, 35, 'Lagomorph', NULL, '0', '2.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (432, 24, 'Canine', NULL, '141', '152', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (433, 24, 'Feline', NULL, '147', '156', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (434, 24, 'Bovine', NULL, '132', '152', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (435, 24, 'Caprine', NULL, '142', '155', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (436, 24, 'Equine', NULL, '132', '146', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (437, 24, 'Porcine', NULL, '135', '150', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (438, 24, 'Lagomorph', NULL, '0', '146', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (439, 25, 'Canine', NULL, '4.4', '5.3', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (440, 25, 'Feline', NULL, '4.0', '4.5', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (441, 25, 'Bovine', NULL, '3.9', '5.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (442, 25, 'Caprine', NULL, '3.5', '6.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (443, 25, 'Equine', NULL, '2.4', '4.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (444, 25, 'Porcine', NULL, '4.4', '6.7', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (445, 25, 'Lagomorph', NULL, '0', '5.8', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (446, 26, 'Canine', NULL, '105', '115', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (447, 26, 'Feline', NULL, '117', '123', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (448, 26, 'Bovine', NULL, '97', '111', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (449, 26, 'Caprine', NULL, '99', '110', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (450, 26, 'Equine', NULL, '99', '109', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (451, 26, 'Porcine', NULL, '94', '106', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (452, 26, 'Lagomorph', NULL, '85', '105', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (453, 14, 'Canine', NULL, '65', '118', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (454, 14, 'Feline', NULL, '73', '134', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (455, 14, 'Bovine', NULL, '45', '75', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (456, 14, 'Caprine', NULL, '50', '75', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (457, 14, 'Equine', NULL, '75', '115', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (458, 14, 'Porcine', NULL, '85', '115', NULL);
INSERT INTO public.lab_ref_ranges (id, test_id, species, breed, min, max, ref_text) VALUES (459, 14, 'Lagomorph', NULL, '50', '93.2', NULL);


--
-- Data for Name: lab_test_categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.lab_test_categories (id, name, description) VALUES (1, 'Hematology', NULL);
INSERT INTO public.lab_test_categories (id, name, description) VALUES (2, 'Biochemistry', NULL);
INSERT INTO public.lab_test_categories (id, name, description) VALUES (3, 'Urinalysis', NULL);
INSERT INTO public.lab_test_categories (id, name, description) VALUES (4, 'Faecal Sample', NULL);
INSERT INTO public.lab_test_categories (id, name, description) VALUES (5, 'Imaging', NULL);
INSERT INTO public.lab_test_categories (id, name, description) VALUES (6, 'Rapid Tests', NULL);
INSERT INTO public.lab_test_categories (id, name, description) VALUES (7, 'Microbiology', NULL);
INSERT INTO public.lab_test_categories (id, name, description) VALUES (8, 'Endocrine', NULL);
INSERT INTO public.lab_test_categories (id, name, description) VALUES (9, 'Reproductive', NULL);
INSERT INTO public.lab_test_categories (id, name, description) VALUES (10, 'Ultrasonography', NULL);


--
-- Data for Name: lab_tests; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (3, 1, 'PCV (HCT)', 'General', '%', 3);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (6, 1, 'MCV', 'General', 'fL', 6);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (7, 1, 'MCH', 'General', 'pg', 7);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (9, 1, 'Neutrophils', 'General', '%', 9);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (10, 1, 'Lymphocytes', 'General', '%', 10);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (11, 1, 'Monocytes', 'General', '%', 11);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (12, 1, 'Eosinophils', 'General', '%', 12);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (13, 1, 'Basophils', 'General', '%', 13);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (14, 2, 'Glucose', 'General', 'mg/dL', 1);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (15, 2, 'Urea (BUN)', 'General', 'mg/dL', 2);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (16, 2, 'Creatinine', 'General', 'mg/dL', 3);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (17, 2, 'ALT (SGPT)', 'General', 'U/L', 4);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (18, 2, 'AST (SGOT)', 'General', 'U/L', 5);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (19, 2, 'ALP', 'General', 'U/L', 6);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (20, 2, 'Total Protein', 'General', 'g/dL', 7);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (21, 2, 'Albumin', 'General', 'g/dL', 8);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (22, 2, 'Globulin', 'General', 'g/dL', 9);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (23, 2, 'Total Bilirubin', 'General', 'mg/dL', 10);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (27, 2, 'Calcium', 'General', 'mg/dL', 14);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (28, 2, 'Phosphorus', 'General', 'mg/dL', 15);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (2, 1, 'Hemoglobin (Hb)', 'General', '% (g/dL)', 2);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (1, 1, 'RBC', 'General', 'x10^6/µL', 1);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (8, 1, 'MCHC', 'General', '% (g/dL)', 8);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (4, 1, 'WBC', 'General', 'x10^3/µL', 4);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (29, 2, 'GGT', NULL, 'U/L', 1);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (30, 2, 'Cholesterol', NULL, 'mg/dL', 1);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (31, 2, 'Triglyceride', NULL, 'mg/dL', 1);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (32, 2, 'Amylase', NULL, 'U/L', 1);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (33, 2, 'Lipase', NULL, 'U/L', 1);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (34, 2, 'CK (CPK)', NULL, 'U/L', 1);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (35, 2, 'Magnesium', NULL, 'mg/dL', 1);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (24, 2, 'Sodium', 'General', 'mEq/L', 11);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (25, 2, 'Potassium', 'General', 'mEq/L', 12);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (26, 2, 'Chloride', 'General', 'mEq/L', 13);
INSERT INTO public.lab_tests (id, category_id, name, section, unit, sort_order) VALUES (5, 1, 'Platelet Count', 'General', 'x10^3/µL', 5);


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.roles (id, name, description, permissions, is_system) OVERRIDING SYSTEM VALUE VALUES (4, 'receptionist', 'Front desk access for managing appointments and owners', '["dashboard.view", "patients.view", "patients.create", "patients.edit", "owners.view", "owners.create", "owners.edit", "appointments.view", "appointments.create", "appointments.edit", "medical_records.view", "billing.view", "billing.create", "billing.edit", "fee_structure.view", "inventory.view", "inventory.manage", "medical_records.create"]', 'false');
INSERT INTO public.roles (id, name, description, permissions, is_system) OVERRIDING SYSTEM VALUE VALUES (3, 'doctor', 'Clinical access including medical records and appointments', '["dashboard.view", "patients.view", "patients.create", "patients.edit", "owners.view", "owners.create", "owners.edit", "appointments.view", "appointments.create", "appointments.edit", "medical_records.view", "medical_records.create", "medical_records.delete", "billing.view", "billing.create", "billing.edit", "reports.view"]', 'false');
INSERT INTO public.roles (id, name, description, permissions, is_system) OVERRIDING SYSTEM VALUE VALUES (5, 'pharmacy', 'Pharmacy staff - can add medicine prices to forwarded invoices', '["dashboard.view", "patients.view", "billing.view", "billing.edit", "medical_records.view", "activity_log.view"]', 'false');
INSERT INTO public.roles (id, name, description, permissions, is_system) OVERRIDING SYSTEM VALUE VALUES (1, 'superadmin', 'Full system access with all permissions', '["dashboard.view", "patients.view", "patients.create", "patients.edit", "patients.delete", "owners.view", "owners.create", "owners.edit", "owners.delete", "appointments.view", "appointments.create", "appointments.edit", "appointments.delete", "medical_records.view", "medical_records.create", "medical_records.delete", "billing.view", "billing.create", "billing.edit", "billing.delete", "fee_structure.view", "fee_structure.manage", "user_management.view", "user_management.manage", "roles.manage", "backup.export", "admin_dashboard.view", "data.erase", "inventory.view", "inventory.manage", "purchase.view", "purchase.create", "purchase.edit", "purchase.delete", "purchase.manage", "accounts.view", "accounts.manage", "reports.view", "activity_log.view"]', 'true');
INSERT INTO public.roles (id, name, description, permissions, is_system) OVERRIDING SYSTEM VALUE VALUES (2, 'admin', 'Administrator access with most permissions except data erasure', '["dashboard.view", "patients.view", "patients.create", "patients.edit", "patients.delete", "owners.view", "owners.create", "owners.edit", "owners.delete", "appointments.view", "appointments.create", "appointments.edit", "appointments.delete", "medical_records.view", "medical_records.create", "medical_records.delete", "billing.view", "billing.create", "billing.edit", "billing.delete", "fee_structure.view", "fee_structure.manage", "user_management.view", "user_management.manage", "roles.manage", "backup.export", "admin_dashboard.view", "inventory.view", "inventory.manage", "purchase.view", "purchase.create", "purchase.edit", "purchase.delete", "purchase.manage", "accounts.view", "accounts.manage", "reports.view", "activity_log.view"]', 'true');


--
-- Data for Name: species; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.species (id, name) VALUES (1, 'Dog');
INSERT INTO public.species (id, name) VALUES (2, 'Cat');
INSERT INTO public.species (id, name) VALUES (3, 'Cow');
INSERT INTO public.species (id, name) VALUES (4, 'Horse');
INSERT INTO public.species (id, name) VALUES (5, 'Bird');
INSERT INTO public.species (id, name) VALUES (6, 'Goat');
INSERT INTO public.species (id, name) VALUES (7, 'Pig');
INSERT INTO public.species (id, name) VALUES (8, 'Elephant');
INSERT INTO public.species (id, name) VALUES (9, 'Rabbit');
INSERT INTO public.species (id, name) VALUES (10, 'Canine');
INSERT INTO public.species (id, name) VALUES (11, 'Feline');
INSERT INTO public.species (id, name) VALUES (12, 'Bovine');
INSERT INTO public.species (id, name) VALUES (13, 'Equine');
INSERT INTO public.species (id, name) VALUES (14, 'Avian');
INSERT INTO public.species (id, name) VALUES (15, 'Caprine');
INSERT INTO public.species (id, name) VALUES (16, 'Porcine');
INSERT INTO public.species (id, name) VALUES (17, 'Lagomorph');


--
-- Data for Name: tax_categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tax_categories (id, name, purchase_sgst, sales_sgst, purchase_cgst, sales_cgst, purchase_igst, sales_igst) VALUES (1, 'NA', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00);
INSERT INTO public.tax_categories (id, name, purchase_sgst, sales_sgst, purchase_cgst, sales_cgst, purchase_igst, sales_igst) VALUES (2, '18%', 9.00, 0.00, 9.00, 0.00, 18.00, 0.00);
INSERT INTO public.tax_categories (id, name, purchase_sgst, sales_sgst, purchase_cgst, sales_cgst, purchase_igst, sales_igst) VALUES (3, '5%', 2.50, 0.00, 2.50, 0.00, 5.00, 0.00);


--
-- Data for Name: tenant_migrations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tenants (id, name, slug, created_at, status, plan, contact_name, contact_email, contact_phone, address, is_demo, demo_until, valid_until) OVERRIDING SYSTEM VALUE VALUES (1, 'PetPoint Veterinary Clinic', 'petpoint-veterinary-clinic', '2026-11-21 19:53:07.222985', 'active', 'standard', NULL, NULL, NULL, NULL, false, NULL, NULL);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, name, email, phone, password, role, permissions) OVERRIDING SYSTEM VALUE VALUES (5, 'Dr Varsha M', 'varsha2015m@gmail.com', '8606159137', '$2b$10$mpv5e7mx360fIUnOga5PQuypR4p2fchs/CpENMoo8kMqboFwtLBMu', 'doctor', '["dashboard.view", "patients.view", "patients.create", "patients.edit", "patients.delete", "owners.view", "owners.create", "owners.edit", "owners.delete", "appointments.view", "appointments.create", "appointments.edit", "appointments.delete", "medical_records.view", "medical_records.create", "medical_records.delete", "billing.view", "billing.create", "billing.edit", "billing.delete", "fee_structure.view", "fee_structure.manage", "user_management.view", "user_management.manage", "roles.manage", "backup.export", "admin_dashboard.view", "inventory.view", "inventory.manage", "accounts.view", "accounts.manage"]');
INSERT INTO public.users (id, name, email, phone, password, role, permissions) OVERRIDING SYSTEM VALUE VALUES (6, 'Dr Athulya P S', 'drathulyaps@gmail.com', '9744093621', '$2b$10$Ajs3o6z9gaYxr5gQw5EFMOh1qWoZ1i/MWLHqwGtd2vcOWtNhPqDHi', 'doctor', '["dashboard.view", "patients.view", "patients.create", "patients.edit", "patients.delete", "owners.view", "owners.create", "owners.edit", "owners.delete", "appointments.view", "appointments.create", "appointments.edit", "appointments.delete", "medical_records.view", "medical_records.create", "medical_records.delete", "billing.view", "billing.create", "billing.edit", "billing.delete", "fee_structure.view", "fee_structure.manage", "user_management.view", "user_management.manage", "roles.manage", "backup.export", "admin_dashboard.view", "inventory.view", "inventory.manage", "accounts.view", "accounts.manage"]');
INSERT INTO public.users (id, name, email, phone, password, role, permissions) OVERRIDING SYSTEM VALUE VALUES (7, 'Super Admin', 'superadmin@empab.in', '', '$2b$10$UEUM3RJCzeJz89wlhODe9e.1oITW6R/JGJPkVgoBj3CcFZwrWwmOO', 'superadmin', NULL);
INSERT INTO public.users (id, name, email, phone, password, role, permissions) OVERRIDING SYSTEM VALUE VALUES (3, 'Dr.Maneesh K M', 'maneeshkmctnr@gmail.com', '9567528371', '$2b$10$29YOkqm5VdJzireKaqNbWuf5VR.nqKvwbzJsV3A.IGF03OaOGPTI6', 'doctor', NULL);
INSERT INTO public.users (id, name, email, phone, password, role, permissions) OVERRIDING SYSTEM VALUE VALUES (4, 'Receptionist', 'sradhaetsradhaet@gmail.com', '9447770876', '$2b$10$GqYDW0gxdAOFRBrG/syuMO69s1uoeZrDpF6ZDv8qKsNdx/meHU60y', 'receptionist', NULL);
INSERT INTO public.users (id, name, email, phone, password, role, permissions) OVERRIDING SYSTEM VALUE VALUES (1, 'Super Admin', 'superadmin@petpointvet.in', '', '$2b$10$QCBTGxThjwSunAorr1DayuxF0hhGw27ZlxarHIqFxiac/Tly6kJjW', 'superadmin', NULL);
INSERT INTO public.users (id, name, email, phone, password, role, permissions) OVERRIDING SYSTEM VALUE VALUES (2, 'Admin', 'admin@petpointvet.in', '', '$2b$10$FToA0H5NpOj1fLw3nFAPPulIVS5F6CISb9BghVsW3WbH45bcWRdV.', 'admin', NULL);


--
-- Name: blood_smear_pathogens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.blood_smear_pathogens_id_seq', 48, true);


--
-- Name: lab_ref_ranges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lab_ref_ranges_id_seq', 467, true);


--
-- Name: lab_test_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lab_test_categories_id_seq', 10, true);


--
-- Name: lab_tests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lab_tests_id_seq', 35, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 5, true);


--
-- Name: species_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.species_id_seq', 17, true);


--
-- Name: tax_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tax_categories_id_seq', 3, true);


--
-- Name: tenants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tenants_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 8, true);


--
-- PostgreSQL database dump complete
--



