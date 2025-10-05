"""WebSocket connection manager for real-time updates."""

import asyncio
import json
from typing import Dict, List, Set, Optional
from fastapi import WebSocket
import structlog

logger = structlog.get_logger(__name__)


class WebSocketManager:
    """Manages WebSocket connections and broadcasts."""
    
    def __init__(self):
        # Store connections by channel
        self.connections: Dict[str, Set[WebSocket]] = {
            "metrics": set(),
            "alerts": set(),
            "general": set()
        }
        
        # Store subscriptions per connection
        self.subscriptions: Dict[WebSocket, Set[str]] = {}
        
        # Connection metadata
        self.connection_metadata: Dict[WebSocket, Dict] = {}
    
    async def connect(self, websocket: WebSocket, channel: str = "general"):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        
        # Add to appropriate channel
        if channel not in self.connections:
            self.connections[channel] = set()
        
        self.connections[channel].add(websocket)
        self.subscriptions[websocket] = {channel}
        self.connection_metadata[websocket] = {
            "connected_at": asyncio.get_event_loop().time(),
            "channel": channel,
            "message_count": 0
        }
        
        logger.info(
            "WebSocket connected",
            channel=channel,
            total_connections=sum(len(conns) for conns in self.connections.values())
        )
        
        # Send welcome message
        await self.send_personal_message(websocket, {
            "type": "connection_established",
            "channel": channel,
            "timestamp": asyncio.get_event_loop().time()
        })
    
    def disconnect(self, websocket: WebSocket, channel: Optional[str] = None):
        """Remove a WebSocket connection."""
        
        # Remove from all channels if no specific channel provided
        if channel is None:
            for channel_name, connections in self.connections.items():
                connections.discard(websocket)
        else:
            if channel in self.connections:
                self.connections[channel].discard(websocket)
        
        # Clean up metadata
        self.subscriptions.pop(websocket, None)
        metadata = self.connection_metadata.pop(websocket, {})
        
        logger.info(
            "WebSocket disconnected",
            channel=channel or "all",
            duration=asyncio.get_event_loop().time() - metadata.get("connected_at", 0),
            messages_sent=metadata.get("message_count", 0),
            total_connections=sum(len(conns) for conns in self.connections.values())
        )
    
    async def send_personal_message(self, websocket: WebSocket, message: dict):
        """Send a message to a specific WebSocket connection."""
        try:
            await websocket.send_text(json.dumps(message, default=str))
            
            # Update message count
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["message_count"] += 1
                
        except Exception as e:
            logger.warning("Failed to send personal message", error=str(e))
            # Remove disconnected websocket
            self.disconnect(websocket)
    
    async def broadcast(self, message: str, channel: str = "general"):
        """Broadcast a message to all connections in a channel."""
        
        if channel not in self.connections:
            logger.warning("Attempted to broadcast to non-existent channel", channel=channel)
            return
        
        connections = self.connections[channel].copy()  # Copy to avoid modification during iteration
        disconnected = []
        
        for websocket in connections:
            try:
                await websocket.send_text(message)
                
                # Update message count
                if websocket in self.connection_metadata:
                    self.connection_metadata[websocket]["message_count"] += 1
                    
            except Exception as e:
                logger.warning("Failed to send broadcast message", error=str(e))
                disconnected.append(websocket)
        
        # Clean up disconnected websockets
        for websocket in disconnected:
            self.disconnect(websocket, channel)
        
        if connections:
            logger.debug(
                "Broadcast sent",
                channel=channel,
                recipients=len(connections) - len(disconnected),
                failed=len(disconnected)
            )
    
    async def subscribe(self, websocket: WebSocket, metrics_type: str):
        """Subscribe a connection to specific metrics updates."""
        
        if websocket not in self.subscriptions:
            self.subscriptions[websocket] = set()
        
        self.subscriptions[websocket].add(metrics_type)
        
        logger.debug(
            "WebSocket subscribed to metrics",
            metrics_type=metrics_type,
            total_subscriptions=len(self.subscriptions[websocket])
        )
        
        # Send confirmation
        await self.send_personal_message(websocket, {
            "type": "subscription_confirmed",
            "metrics_type": metrics_type,
            "timestamp": asyncio.get_event_loop().time()
        })
    
    async def unsubscribe(self, websocket: WebSocket, metrics_type: str):
        """Unsubscribe a connection from specific metrics updates."""
        
        if websocket in self.subscriptions:
            self.subscriptions[websocket].discard(metrics_type)
            
            logger.debug(
                "WebSocket unsubscribed from metrics",
                metrics_type=metrics_type,
                remaining_subscriptions=len(self.subscriptions[websocket])
            )
            
            # Send confirmation
            await self.send_personal_message(websocket, {
                "type": "unsubscription_confirmed",
                "metrics_type": metrics_type,
                "timestamp": asyncio.get_event_loop().time()
            })
    
    async def broadcast_to_subscribers(self, message: dict, metrics_type: str):
        """Broadcast a message to subscribers of a specific metrics type."""
        
        message_str = json.dumps(message, default=str)
        disconnected = []
        sent_count = 0
        
        for websocket, subscriptions in self.subscriptions.items():
            if metrics_type in subscriptions or "all" in subscriptions:
                try:
                    await websocket.send_text(message_str)
                    sent_count += 1
                    
                    # Update message count
                    if websocket in self.connection_metadata:
                        self.connection_metadata[websocket]["message_count"] += 1
                        
                except Exception as e:
                    logger.warning("Failed to send subscriber message", error=str(e))
                    disconnected.append(websocket)
        
        # Clean up disconnected websockets
        for websocket in disconnected:
            self.disconnect(websocket)
        
        if sent_count > 0:
            logger.debug(
                "Broadcast sent to subscribers",
                metrics_type=metrics_type,
                recipients=sent_count,
                failed=len(disconnected)
            )
    
    def get_connection_stats(self) -> dict:
        """Get statistics about current connections."""
        
        total_connections = sum(len(conns) for conns in self.connections.values())
        
        stats = {
            "total_connections": total_connections,
            "connections_by_channel": {
                channel: len(connections) 
                for channel, connections in self.connections.items()
            },
            "total_subscriptions": len(self.subscriptions),
            "subscription_types": {}
        }
        
        # Count subscription types
        for subscriptions in self.subscriptions.values():
            for sub_type in subscriptions:
                stats["subscription_types"][sub_type] = stats["subscription_types"].get(sub_type, 0) + 1
        
        return stats
    
    async def send_heartbeat(self):
        """Send heartbeat to all connections to keep them alive."""
        
        heartbeat_message = {
            "type": "heartbeat",
            "timestamp": asyncio.get_event_loop().time()
        }
        
        for channel in self.connections:
            await self.broadcast(json.dumps(heartbeat_message), channel)
    
    async def cleanup_stale_connections(self, max_idle_time: float = 300):
        """Clean up connections that haven't been active."""
        
        current_time = asyncio.get_event_loop().time()
        stale_connections = []
        
        for websocket, metadata in self.connection_metadata.items():
            if current_time - metadata.get("connected_at", 0) > max_idle_time:
                # Check if connection is still alive
                try:
                    await websocket.ping()
                except:
                    stale_connections.append(websocket)
        
        # Remove stale connections
        for websocket in stale_connections:
            self.disconnect(websocket)
        
        if stale_connections:
            logger.info("Cleaned up stale connections", count=len(stale_connections))
    
    async def start_background_tasks(self):
        """Start background maintenance tasks."""
        
        async def heartbeat_task():
            while True:
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
                await self.send_heartbeat()
        
        async def cleanup_task():
            while True:
                await asyncio.sleep(60)  # Cleanup every minute
                await self.cleanup_stale_connections()
        
        # Start tasks
        asyncio.create_task(heartbeat_task())
        asyncio.create_task(cleanup_task())