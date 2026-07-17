import { NextResponse } from "next/server";
import { getActiveVisitors } from "../../../(dashboard)/admin/actions/analytics-shared";

export async function GET() {
  const activeVisitors = await getActiveVisitors();

  let weather = null;
  try {
    const weatherRes = await fetch("https://api.open-meteo.com/v1/forecast?latitude=6.9271&longitude=79.8612&current=temperature_2m,weather_code", {
      next: { revalidate: 1800 } // cache for 30 mins
    });
    if (weatherRes.ok) {
      const data = await weatherRes.json();
      const temp = Math.round(data.current.temperature_2m);
      const code = data.current.weather_code;
      
      let condition = "Clear";
      let icon = "01d";
      if (code >= 1 && code <= 3) {
        condition = "Cloudy";
        icon = "02d";
      } else if (code === 45 || code === 48) {
        condition = "Foggy";
        icon = "50d";
      } else if (code >= 51 && code <= 55) {
        condition = "Drizzle";
        icon = "09d";
      } else if (code >= 61 && code <= 65) {
        condition = "Rainy";
        icon = "10d";
      } else if (code >= 80 && code <= 82) {
        condition = "Showers";
        icon = "09d";
      } else if (code >= 95) {
        condition = "Thunderstorm";
        icon = "11d";
      }

      weather = {
        city: "Colombo",
        temp: `${temp}°C`,
        condition,
        iconUrl: `https://openweathermap.org/img/wn/${icon}@2x.png`
      };
    }
  } catch (err) {
    console.error("Failed to fetch weather:", err);
  }

  return NextResponse.json({
    activeVisitors,
    weather,
  });
}
