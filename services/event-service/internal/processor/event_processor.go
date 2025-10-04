package processor

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"event-service/internal/config"
	"event-service/internal/models"
)

// EventProcessor handles event processing, enrichment, and aggregation
type EventProcessor struct {
	config           *config.Config
	enricher         *EventEnricher
	aggregator       *EventAggregator
	deduplicator     *EventDeduplicator
	filter           *EventFilter
	metrics          *ProcessorMetrics
	mu               sync.RWMutex
	processingBuffer chan ProcessingTask
	workers          int
	stopCh           chan struct{}
	wg               sync.WaitGroup
}

// ProcessingTask represents a task for processing an event
type ProcessingTask struct {
	Event     interface{}
	EventType models.EventType
	Context   context.Context
	Callback  func(ProcessedEvent, error)
}

// ProcessedEvent represents an event after processing
type ProcessedEvent struct {
	OriginalEvent   interface{}            `json:"original_event"`
	EnrichedData    map[string]interface{} `json:"enriched_data"`
	AggregatedData  map[string]interface{} `json:"aggregated_data"`
	ProcessingMeta  ProcessingMetadata     `json:"processing_meta"`
	RoutingDecision RoutingDecision        `json:"routing_decision"`
}

// ProcessingMetadata contains metadata about the processing
type ProcessingMetadata struct {
	ProcessedAt        time.Time `json:"processed_at"`
	ProcessingTimeMs   int64     `json:"processing_time_ms"`
	EnrichmentApplied  bool      `json:"enrichment_applied"`
	AggregationApplied bool      `json:"aggregation_applied"`
	FiltersPassed      []string  `json:"filters_passed"`
	ProcessorVersion   string    `json:"processor_version"`
}

// RoutingDecision contains information about where to route the event
type RoutingDecision struct {
	PrimaryTopics   []string `json:"primary_topics"`
	SecondaryTopics []string `json:"secondary_topics"`
	ShouldStore     bool     `json:"should_store"`
	ShouldAggregate bool     `json:"should_aggregate"`
	Priority        int      `json:"priority"`
}

// ProcessorMetrics tracks processing performance
type ProcessorMetrics struct {
	EventsProcessed       int64
	EventsEnriched        int64
	EventsAggregated      int64
	EventsFiltered        int64
	EventsDeduplicated    int64
	AverageProcessingTime float64
	ErrorCount            int64
	QueueDepth            int64
	WorkerUtilization     float64
	LastProcessedTime     time.Time
	mu                    sync.RWMutex
}

// NewEventProcessor creates a new event processor
func NewEventProcessor(cfg *config.Config) *EventProcessor {
	workers := cfg.EventProcessor.Workers
	if workers <= 0 {
		workers = 4 // Default to 4 workers
	}

	bufferSize := cfg.EventProcessor.BufferSize
	if bufferSize <= 0 {
		bufferSize = 1000 // Default buffer size
	}

	processor := &EventProcessor{
		config:           cfg,
		enricher:         NewEventEnricher(cfg),
		aggregator:       NewEventAggregator(cfg),
		deduplicator:     NewEventDeduplicator(cfg),
		filter:           NewEventFilter(cfg),
		metrics:          &ProcessorMetrics{},
		processingBuffer: make(chan ProcessingTask, bufferSize),
		workers:          workers,
		stopCh:           make(chan struct{}),
	}

	// Start worker goroutines
	processor.startWorkers()

	return processor
}

// ProcessEvent processes a single event asynchronously
func (p *EventProcessor) ProcessEvent(ctx context.Context, event interface{}, eventType models.EventType) (<-chan ProcessedEvent, <-chan error) {
	resultCh := make(chan ProcessedEvent, 1)
	errorCh := make(chan error, 1)

	task := ProcessingTask{
		Event:     event,
		EventType: eventType,
		Context:   ctx,
		Callback: func(result ProcessedEvent, err error) {
			if err != nil {
				errorCh <- err
			} else {
				resultCh <- result
			}
			close(resultCh)
			close(errorCh)
		},
	}

	select {
	case p.processingBuffer <- task:
		p.updateQueueDepth(1)
	case <-ctx.Done():
		errorCh <- ctx.Err()
		close(resultCh)
		close(errorCh)
	default:
		errorCh <- fmt.Errorf("processing buffer full, cannot accept more events")
		close(resultCh)
		close(errorCh)
	}

	return resultCh, errorCh
}

// ProcessEventSync processes a single event synchronously
func (p *EventProcessor) ProcessEventSync(ctx context.Context, event interface{}, eventType models.EventType) (ProcessedEvent, error) {
	startTime := time.Now()

	// Step 1: Check for duplicates
	isDuplicate, err := p.deduplicator.IsDuplicate(ctx, event, eventType)
	if err != nil {
		p.recordError()
		return ProcessedEvent{}, fmt.Errorf("deduplication check failed: %w", err)
	}

	if isDuplicate {
		p.recordDeduplication()
		return ProcessedEvent{}, fmt.Errorf("duplicate event detected")
	}

	// Step 2: Apply filters
	filterResult, err := p.filter.ShouldProcess(ctx, event, eventType)
	if err != nil {
		p.recordError()
		return ProcessedEvent{}, fmt.Errorf("event filtering failed: %w", err)
	}

	if !filterResult.ShouldProcess {
		p.recordFiltered()
		return ProcessedEvent{}, fmt.Errorf("event filtered out: %s", filterResult.Reason)
	}

	// Step 3: Enrich event
	enrichedData, err := p.enricher.EnrichEvent(ctx, event, eventType)
	if err != nil {
		log.Printf("Event enrichment failed: %v", err)
		enrichedData = make(map[string]interface{}) // Continue with empty enrichment
	}

	// Step 4: Aggregate event data
	aggregatedData, err := p.aggregator.AggregateEvent(ctx, event, eventType, enrichedData)
	if err != nil {
		log.Printf("Event aggregation failed: %v", err)
		aggregatedData = make(map[string]interface{}) // Continue with empty aggregation
	}

	// Step 5: Determine routing
	routingDecision := p.determineRouting(event, eventType, enrichedData, filterResult)

	// Step 6: Record deduplication key
	if err := p.deduplicator.RecordEvent(ctx, event, eventType); err != nil {
		log.Printf("Failed to record event for deduplication: %v", err)
	}

	processingTime := time.Since(startTime)

	processedEvent := ProcessedEvent{
		OriginalEvent:  event,
		EnrichedData:   enrichedData,
		AggregatedData: aggregatedData,
		ProcessingMeta: ProcessingMetadata{
			ProcessedAt:        time.Now(),
			ProcessingTimeMs:   processingTime.Milliseconds(),
			EnrichmentApplied:  len(enrichedData) > 0,
			AggregationApplied: len(aggregatedData) > 0,
			FiltersPassed:      filterResult.FiltersPassed,
			ProcessorVersion:   "1.0.0",
		},
		RoutingDecision: routingDecision,
	}

	// Update metrics
	p.recordSuccess(processingTime, len(enrichedData) > 0, len(aggregatedData) > 0)

	return processedEvent, nil
}

// startWorkers starts the worker goroutines for processing events
func (p *EventProcessor) startWorkers() {
	for i := 0; i < p.workers; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
}

// worker processes events from the buffer
func (p *EventProcessor) worker(workerID int) {
	defer p.wg.Done()

	log.Printf("Event processor worker %d started", workerID)

	for {
		select {
		case task := <-p.processingBuffer:
			p.updateQueueDepth(-1)

			result, err := p.ProcessEventSync(task.Context, task.Event, task.EventType)
			task.Callback(result, err)

		case <-p.stopCh:
			log.Printf("Event processor worker %d stopping", workerID)
			return
		}
	}
}

// determineRouting determines where to route the processed event
func (p *EventProcessor) determineRouting(event interface{}, eventType models.EventType, enrichedData map[string]interface{}, filterResult FilterResult) RoutingDecision {
	decision := RoutingDecision{
		PrimaryTopics:   []string{},
		SecondaryTopics: []string{},
		ShouldStore:     true,
		ShouldAggregate: true,
		Priority:        1,
	}

	// Determine primary topics based on event type
	switch eventType {
	case models.EventTypeAttempt:
		decision.PrimaryTopics = []string{p.config.Kafka.TopicAttempts}
		decision.SecondaryTopics = []string{"ml.training_events", "analytics.user_attempts"}
		decision.Priority = 2 // High priority for learning events

	case models.EventTypeSession:
		decision.PrimaryTopics = []string{p.config.Kafka.TopicSessions}
		decision.SecondaryTopics = []string{"analytics.user_sessions"}
		decision.Priority = 1 // Medium priority

	case models.EventTypePlacement:
		decision.PrimaryTopics = []string{p.config.Kafka.TopicPlacements}
		decision.SecondaryTopics = []string{"ml.training_events", "analytics.placements"}
		decision.Priority = 3 // Highest priority for placement tests

	default:
		decision.PrimaryTopics = []string{"events.general"}
		decision.Priority = 0 // Lowest priority
	}

	// Add enrichment-based routing
	if userType, exists := enrichedData["user_type"]; exists {
		if userType == "premium" {
			decision.SecondaryTopics = append(decision.SecondaryTopics, "analytics.premium_users")
		}
	}

	if jurisdiction, exists := enrichedData["jurisdiction"]; exists {
		decision.SecondaryTopics = append(decision.SecondaryTopics,
			fmt.Sprintf("analytics.jurisdiction_%s", jurisdiction))
	}

	// Apply filter-based routing modifications
	for _, filter := range filterResult.FiltersPassed {
		switch filter {
		case "high_value_user":
			decision.Priority = max(decision.Priority, 2)
			decision.SecondaryTopics = append(decision.SecondaryTopics, "analytics.high_value_users")
		case "suspicious_activity":
			decision.SecondaryTopics = append(decision.SecondaryTopics, "fraud.suspicious_events")
			decision.Priority = 3
		}
	}

	return decision
}

// GetMetrics returns current processor metrics
func (p *EventProcessor) GetMetrics() ProcessorMetrics {
	p.metrics.mu.RLock()
	defer p.metrics.mu.RUnlock()

	// Calculate worker utilization
	queueDepth := float64(len(p.processingBuffer))
	bufferSize := float64(cap(p.processingBuffer))
	utilization := queueDepth / bufferSize * 100

	return ProcessorMetrics{
		EventsProcessed:       p.metrics.EventsProcessed,
		EventsEnriched:        p.metrics.EventsEnriched,
		EventsAggregated:      p.metrics.EventsAggregated,
		EventsFiltered:        p.metrics.EventsFiltered,
		EventsDeduplicated:    p.metrics.EventsDeduplicated,
		AverageProcessingTime: p.metrics.AverageProcessingTime,
		ErrorCount:            p.metrics.ErrorCount,
		QueueDepth:            int64(queueDepth),
		WorkerUtilization:     utilization,
		LastProcessedTime:     p.metrics.LastProcessedTime,
	}
}

// Stop gracefully stops the event processor
func (p *EventProcessor) Stop() {
	close(p.stopCh)
	p.wg.Wait()
	log.Println("Event processor stopped")
}

// Metric recording methods
func (p *EventProcessor) recordSuccess(processingTime time.Duration, enriched, aggregated bool) {
	p.metrics.mu.Lock()
	defer p.metrics.mu.Unlock()

	p.metrics.EventsProcessed++
	if enriched {
		p.metrics.EventsEnriched++
	}
	if aggregated {
		p.metrics.EventsAggregated++
	}

	// Update average processing time using exponential moving average
	processingTimeMs := float64(processingTime.Nanoseconds()) / 1e6
	if p.metrics.AverageProcessingTime == 0 {
		p.metrics.AverageProcessingTime = processingTimeMs
	} else {
		p.metrics.AverageProcessingTime = 0.9*p.metrics.AverageProcessingTime + 0.1*processingTimeMs
	}

	p.metrics.LastProcessedTime = time.Now()
}

func (p *EventProcessor) recordError() {
	p.metrics.mu.Lock()
	defer p.metrics.mu.Unlock()
	p.metrics.ErrorCount++
}

func (p *EventProcessor) recordFiltered() {
	p.metrics.mu.Lock()
	defer p.metrics.mu.Unlock()
	p.metrics.EventsFiltered++
}

func (p *EventProcessor) recordDeduplication() {
	p.metrics.mu.Lock()
	defer p.metrics.mu.Unlock()
	p.metrics.EventsDeduplicated++
}

func (p *EventProcessor) updateQueueDepth(delta int64) {
	p.metrics.mu.Lock()
	defer p.metrics.mu.Unlock()
	p.metrics.QueueDepth += delta
}
