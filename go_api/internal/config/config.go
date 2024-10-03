package config

import "os"

type config struct {
	MongoURI string
	DBName   string
	Port     string
}

func Load() (*config, error) {
	return &config{
		MongoURI: os.Getenv("MONGOURI"),
		DBName:   os.Getenv("DBNAME"),
		Port:     os.Getenv("PORT"),
	}, nil
}
