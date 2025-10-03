package logger

import (
	"context"
	"os"

	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

var log *logrus.Logger

func Init(level, format string) {
	log = logrus.New()

	// Set log level
	switch level {
	case "debug":
		log.SetLevel(logrus.DebugLevel)
	case "info":
		log.SetLevel(logrus.InfoLevel)
	case "warn":
		log.SetLevel(logrus.WarnLevel)
	case "error":
		log.SetLevel(logrus.ErrorLevel)
	default:
		log.SetLevel(logrus.InfoLevel)
	}

	// Set log format
	if format == "json" {
		log.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
		})
	} else {
		log.SetFormatter(&logrus.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
		})
	}

	log.SetOutput(os.Stdout)
}

func GetLogger() *logrus.Logger {
	if log == nil {
		Init("info", "json")
	}
	return log
}

// WithContext creates a logger with trace ID from gRPC context
func WithContext(ctx context.Context) *logrus.Entry {
	logger := GetLogger()
	entry := logger.WithFields(logrus.Fields{})

	// Extract trace ID from gRPC metadata
	if md, ok := metadata.FromIncomingContext(ctx); ok {
		if traceIDs := md.Get("trace-id"); len(traceIDs) > 0 {
			entry = entry.WithField("trace_id", traceIDs[0])
		}
		if userIDs := md.Get("user-id"); len(userIDs) > 0 {
			entry = entry.WithField("user_id", userIDs[0])
		}
	}

	return entry
}

// UnaryServerInterceptor adds logging to gRPC unary calls
func UnaryServerInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		logger := WithContext(ctx)
		logger.WithField("method", info.FullMethod).Info("gRPC call started")

		resp, err := handler(ctx, req)

		if err != nil {
			logger.WithError(err).WithField("method", info.FullMethod).Error("gRPC call failed")
		} else {
			logger.WithField("method", info.FullMethod).Info("gRPC call completed")
		}

		return resp, err
	}
}
