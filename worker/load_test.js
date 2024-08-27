import http from "k6/http";
import { check, sleep } from "k6";

// Define the base URL of your proxy server
const BASE_URL = "http://159.89.206.153:8080"; // Replace with your proxy server URL

export const options = {
  stages: [
    { duration: "30s", target: 10 }, // Ramp up to 10 users over 30 seconds
    { duration: "1m", target: 1000 },
    { duration: "30s", target: 0 }, // Ramp down to 0 users over 30 seconds
  ],
};

export default function () {
  const endpoints = [
    `${BASE_URL}/666d55ed785875a3ffe67865/BigBunnyTrailer/master.m3u8`,
    `${BASE_URL}/667fdc77a77c1ab61f14094b/Alchemy.of.Souls.E07.NF.AV1.1080p.WEB-DL/master.m3u8`,
  ];

  endpoints.forEach((endpoint) => {
    const res = http.get(endpoint);

    check(res, {
      "is status 200": (r) => r.status === 200,
      "response time < 200ms": (r) => r.timings.duration < 200,
    });
  });

  sleep(1);
}
