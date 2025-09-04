import express from "express";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const logDir = path.join(process.cwd(), "logs");
fs.mkdirSync(logDir, { recursive: true });
const traceFile = path.join(logDir, "http_trace.jsonl");

// --- Generador de datos de clima ---
const generateWeatherData = () => {
  const cities = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao"];
  const data = [];
  const startDate = new Date("2024-01-01");

  for (let i = 0; i < 90; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    cities.forEach((city) => {
      const baseTemp = city === "Sevilla" ? 20 : city === "Bilbao" ? 12 : 16;
      const seasonalVariation = Math.sin((i / 60) * Math.PI * 2) * 8;
      const randomVariation = (Math.random() - 0.5) * 6;

      data.push({
        date: date.toISOString().split("T")[0],
        city,
        temperature: Math.round((baseTemp + seasonalVariation + randomVariation) * 10) / 10,
        humidity: Math.round((50 + Math.random() * 40) * 10) / 10,
        pressure: Math.round((1000 + Math.random() * 40) * 10) / 10,
        windSpeed: Math.round((5 + Math.random() * 15) * 10) / 10,
        precipitation: Math.random() > 0.7 ? Math.round(Math.random() * 20 * 10) / 10 : 0,
      });
    });
  }

  return data;
};

// --- Endpoint principal ---
app.get("/api/weather", (req, res) => {
  const data = generateWeatherData();
  const entry = {
    ts: new Date().toISOString(),
    method: "GET",
    endpoint: "/api/weather",
    count: data.length,
  };
  fs.appendFileSync(traceFile, JSON.stringify(entry) + "\n");

  if (WEBHOOK_URL) {
    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {});
  }

  res.json(data);
});

app.listen(PORT, () => {
  console.log(`✅ Backend en http://localhost:${PORT}`);
});
