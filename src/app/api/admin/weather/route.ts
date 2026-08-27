import { NextResponse } from "next/server";
import { getActiveVisitors } from "../../../(dashboard)/admin/actions/analytics-shared";
import sql from "@/lib/db";

export async function GET() {
  // 1. Fetch active visitors and DB bookings simultaneously
  const [activeVisitors, bookings] = await Promise.all([
    getActiveVisitors(),
    sql`
      SELECT title, booking_date, start_time, location
      FROM admin_bookings
      WHERE booking_date >= CURRENT_DATE
        AND location IS NOT NULL
        AND location <> ''
        AND status <> 'cancelled'
      ORDER BY booking_date ASC, start_time ASC, id ASC
      LIMIT 3
    `.catch(e => {
      console.error("Failed to fetch bookings for weather:", e);
      return [];
    })
  ]);

  let weather = null;
  const bookingForecasts: any[] = [];

  // 2. Fetch current weather for Colombo and all booking forecasts concurrently
  const weatherPromises = [];

  weatherPromises.push(
    fetch("https://api.open-meteo.com/v1/forecast?latitude=6.9271&longitude=79.8612&current=temperature_2m,weather_code", {
      next: { revalidate: 1800 }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.current) {
          const temp = Math.round(data.current.temperature_2m);
          const code = data.current.weather_code;
          
          let condition = "Clear";
          let icon = "01d";
          if (code >= 1 && code <= 3) { condition = "Cloudy"; icon = "02d"; }
          else if (code === 45 || code === 48) { condition = "Foggy"; icon = "50d"; }
          else if (code >= 51 && code <= 55) { condition = "Drizzle"; icon = "09d"; }
          else if (code >= 61 && code <= 65) { condition = "Rainy"; icon = "10d"; }
          else if (code >= 80 && code <= 82) { condition = "Showers"; icon = "09d"; }
          else if (code >= 95) { condition = "Thunderstorm"; icon = "11d"; }

          weather = {
            city: "Colombo",
            temp: `${temp}°C`,
            condition,
            iconUrl: `https://openweathermap.org/img/wn/${icon}@2x.png`
          };
        }
      })
      .catch(err => console.error("Failed to fetch weather:", err))
  );

  for (const b of bookings) {
    weatherPromises.push(
      (async () => {
        try {
          const dateObj = new Date(b.booking_date);
          const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });
          const monthStr = dateObj.toLocaleDateString("en-US", { month: "short" });
          const dayNum = dateObj.getDate();
          const displayDate = `${weekday}, ${monthStr} ${dayNum}`;

          const year = dateObj.getFullYear();
          const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dayStr = String(dateObj.getDate()).padStart(2, '0');
          const dateStr = `${year}-${monthNum}-${dayStr}`;

          let startTimeFormatted = "";
          if (b.start_time) {
            const parts = b.start_time.split(":");
            if (parts.length >= 2) {
              const hours = parseInt(parts[0]);
              const minutes = parts[1];
              const ampm = hours >= 12 ? "PM" : "AM";
              const displayHours = hours % 12 || 12;
              startTimeFormatted = `${displayHours}:${minutes} ${ampm}`;
            } else {
              startTimeFormatted = b.start_time;
            }
          }

          let lat: number | null = null;
          let lon: number | null = null;
          
          const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(b.location)}&limit=1`;
          const photonRes = await fetch(photonUrl);
          if (photonRes.ok) {
            const photonData = await photonRes.json();
            if (photonData.features && photonData.features.length > 0) {
              const coords = photonData.features[0].geometry.coordinates;
              lon = coords[0];
              lat = coords[1];
            }
          }

          if (lat === null || lon === null) return;

          const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&start_date=${dateStr}&end_date=${dateStr}&timezone=auto`;
          const forecastRes = await fetch(forecastUrl);
          
          if (forecastRes.ok) {
            const wData = await forecastRes.json();
            if (wData.daily && wData.daily.time && wData.daily.time.length > 0) {
              const code = wData.daily.weather_code[0];
              const tempMax = Math.round(wData.daily.temperature_2m_max[0]);
              const tempMin = Math.round(wData.daily.temperature_2m_min[0]);
              const precipProb = wData.daily.precipitation_probability_max[0] ?? 0;
              
              let condition = "Clear";
              let icon = "01d";
              if (code >= 1 && code <= 3) { condition = "Cloudy"; icon = "02d"; }
              else if (code === 45 || code === 48) { condition = "Foggy"; icon = "50d"; }
              else if (code >= 51 && code <= 55) { condition = "Drizzle"; icon = "09d"; }
              else if (code >= 61 && code <= 65) { condition = "Rainy"; icon = "10d"; }
              else if (code >= 80 && code <= 82) { condition = "Showers"; icon = "09d"; }
              else if (code >= 95) { condition = "Thunderstorm"; icon = "11d"; }
              
              bookingForecasts.push({
                title: b.title,
                location: b.location,
                date: displayDate,
                rawDate: dateStr,
                startTime: startTimeFormatted || null,
                weather: {
                  tempMax: `${tempMax}°C`,
                  tempMin: `${tempMin}°C`,
                  condition,
                  precipitation: `${precipProb}%`,
                  iconUrl: `https://openweathermap.org/img/wn/${icon}@2x.png`
                }
              });
            }
          }
        } catch (e) {
          console.error("Forecast failed for booking", e);
        }
      })()
    );
  }

  await Promise.all(weatherPromises);

  return NextResponse.json({
    activeVisitors,
    weather,
    bookingForecasts
  });
}
