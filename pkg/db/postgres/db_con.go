package postgres

import (
	"fmt"
	"github.com/amankumarsingh77/cloud-video-encoder/internal/config"
	_ "github.com/jackc/pgx/v4/stdlib"
	"github.com/jmoiron/sqlx"
	"time"
)

func NewPsqlDB(c *config.Config) (*sqlx.DB, error) {
	if c.Postgres.PgDriver == "" {
		c.Postgres.PgDriver = "pgx"
	}

	dataSourceName := fmt.Sprintf("host=%s port=%d user=%s dbname=%s sslmode=require password=%s",
		c.Postgres.Host,
		c.Postgres.Port,
		c.Postgres.User,
		c.Postgres.Name,
		c.Postgres.Password,
	)
	db, err := sqlx.Connect(c.Postgres.PgDriver, dataSourceName)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to postgres: %w", err)
	}

	// Set default values if not provided in config
	maxOpenConns := c.Postgres.MaxOpenConns
	if maxOpenConns == 0 {
		maxOpenConns = 60 // Default value
	}
	connMaxLifetime := c.Postgres.ConnMaxLifetime
	if connMaxLifetime == 0 {
		connMaxLifetime = 120 // Default value in seconds
	}
	maxIdleConns := c.Postgres.MaxIdleConns
	if maxIdleConns == 0 {
		maxIdleConns = 30 // Default value
	}
	connMaxIdleTime := c.Postgres.ConnMaxIdleTime
	if connMaxIdleTime == 0 {
		connMaxIdleTime = 20 // Default value in seconds
	}

	db.SetMaxOpenConns(maxOpenConns)
	db.SetConnMaxLifetime(time.Duration(connMaxLifetime) * time.Second)
	db.SetMaxIdleConns(maxIdleConns)
	db.SetConnMaxIdleTime(time.Duration(connMaxIdleTime) * time.Second)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}
	return db, nil
}
