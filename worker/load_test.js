import http from "k6/http";
import { check, sleep } from "k6";

// Define the base URL of your proxy server
const BASE_URL = "https://proxyworker.ak7702401082.workers.dev"; // Replace with your proxy server URL

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "30s", target: 100 },
    { duration: "30s", target: 0 },
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
      "response time < 700ms": (r) => r.timings.duration < 700,
    });
  });

  sleep(1);
}
