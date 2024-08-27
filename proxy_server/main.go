package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	router := mux.NewRouter()
	godotenv.Load()
	
	cdnURLStr := os.Getenv("CDN_URL")
	uri := os.Getenv("MONGO_URI")
	ConnectMongoDB(uri)
	if !strings.HasPrefix(cdnURLStr, "http://") && !strings.HasPrefix(cdnURLStr, "https://") {
		cdnURLStr = "https://" + cdnURLStr
	}
	cdnURL, err := url.Parse(cdnURLStr)
	if err != nil {
		log.Fatalf("Invalid CDN URL: %v", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(cdnURL)

	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		if forwardedFor := req.Header.Get("X-Forwarded-For"); forwardedFor != "" {
			req.Header.Set("X-Forwarded-For", forwardedFor + ", " + req.RemoteAddr)
		} else {
			req.Header.Set("X-Forwarded-For", req.RemoteAddr)
		}
		req.Header.Set("X-Forwarded-Host", req.Header.Get("Host"))
		req.Host = cdnURL.Host
		req.URL.Scheme = cdnURL.Scheme
		req.URL.Host = cdnURL.Host
	}

	hlsHandler := func(w http.ResponseWriter, r *http.Request) {

		if strings.HasSuffix(r.URL.Path, "master.m3u8") {
			videoName := extractInfoFromPath(r.URL.Path)
			log.Printf("Updating view count for user: %s", videoName)
			res, err := UpdateViews(videoName)
			if err != nil {
				log.Fatalf("Error updating views: %v", err)
			}
			if res==0{
				log.Printf("Failed to update view count for video: %s", videoName)
			}
		}
		proxy.ServeHTTP(w, r)
	}

	router.PathPrefix("/").HandlerFunc(hlsHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Starting proxy server on :%s", port)
	log.Printf("Proxying requests to: %s", cdnURL)
	log.Fatal(http.ListenAndServe(":"+port, router))
}

func extractInfoFromPath(path string) string {
	path = strings.TrimPrefix(path, "/")
	path = strings.TrimSuffix(path, "/master.m3u8")

	parts := strings.Split(path, "/")
	if len(parts) >= 2 {
		return parts[0] + "/" + parts[1]+".mp4"
	}
	return ""
}


