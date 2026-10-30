FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY live/requirements.txt live/requirements.txt
RUN pip install --no-cache-dir -r live/requirements.txt

COPY live live
COPY Public Public
COPY src/content/portfolios src/content/portfolios

EXPOSE 8787
CMD ["uvicorn", "live.api:app", "--host", "0.0.0.0", "--port", "8787"]
