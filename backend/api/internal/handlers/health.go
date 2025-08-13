package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

type HealthHandler struct {
	db    *sql.DB
	redis *redis.Client
}

func NewHealthHandler(db *sql.DB, redis *redis.Client) *HealthHandler {
	return &HealthHandler{
		db:    db,
		redis: redis,
	}
}

func (h *HealthHandler) Health(c *gin.Context) {
	health := gin.H{
		"status": "ok",
		"services": gin.H{},
	}

	// Check database connection
	if err := h.db.Ping(); err != nil {
		health["status"] = "degraded"
		health["services"].(gin.H)["database"] = gin.H{
			"status": "unhealthy",
			"error":  err.Error(),
		}
	} else {
		health["services"].(gin.H)["database"] = gin.H{
			"status": "healthy",
		}
	}

	// Check Redis connection
	ctx := h.redis.Context()
	if err := h.redis.Ping(ctx).Err(); err != nil {
		health["status"] = "degraded"
		health["services"].(gin.H)["redis"] = gin.H{
			"status": "unhealthy",
			"error":  err.Error(),
		}
	} else {
		health["services"].(gin.H)["redis"] = gin.H{
			"status": "healthy",
		}
	}

	status := http.StatusOK
	if health["status"] == "degraded" {
		status = http.StatusServiceUnavailable
	}

	c.JSON(status, health)
}
