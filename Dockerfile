FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml ./
COPY whattowear ./whattowear
COPY html ./html

RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir .

COPY config ./config

ENV WTW_URL_PREFIX=/wtw
ENV PYTHONUNBUFFERED=1

EXPOSE 8256

LABEL org.opencontainers.image.source=https://github.com/watsona4/clothing

CMD ["gunicorn", "--chdir=/app", "--bind=0.0.0.0:8256", "--log-level=debug", "whattowear:create_app()", "--workers=2", "--threads=4"]
