package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	r := gin.Default()
	
	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "ok",
			"service":   "event-service",
			"timestamp": gin.H{},
		})
	})

	// TODO: Add event ingestion endpoints
	// r.POST("/events/attempt", handleAttemptEvent)
	// r.POST("/events/session", handleSessionEvent)
	// r.POST("/events/batch", handleBatchEvents)

	log.Printf("Event service listening on port %s", port)
	r.Run(":" + port)
}