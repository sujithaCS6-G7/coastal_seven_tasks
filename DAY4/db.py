import psycopg2   ## conn library

def get_connection():  ## create fun
    conn = psycopg2.connect(
        host="localhost",
        database="internship_db",
        user="postgres",
        password="Suji@123"
    )
    return conn