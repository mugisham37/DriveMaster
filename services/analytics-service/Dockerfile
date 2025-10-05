FROM apache/airflow:2.7.3-python3.11

USER root

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

USER airflow

# Copy requirements and install Python dependencies
COPY requirements.txt /requirements.txt
RUN pip install --no-cache-dir -r /requirements.txt

# Copy DAGs and plugins
COPY dags/ /opt/airflow/dags/
COPY plugins/ /opt/airflow/plugins/
COPY config/ /opt/airflow/config/

# Set environment variables
ENV AIRFLOW__CORE__LOAD_EXAMPLES=False
ENV AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION=True
ENV AIRFLOW__WEBSERVER__EXPOSE_CONFIG=True