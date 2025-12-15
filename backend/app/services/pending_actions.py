"""
Pending Actions Store - Enhanced version

Manages temporary storage for actions awaiting user confirmation via WhatsApp.
Now includes user_id-based lookups for text confirmation flow.
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, List
import threading


class PendingActionsStore:
    """Thread-safe store for pending user actions"""
    
    def __init__(self, expiry_minutes: int = 10):
        self._store: Dict[str, Dict[str, Any]] = {}  # {action_id: {user_id, type, params, created_at}}
        self._user_index: Dict[str, List[str]] = {}  # {user_id: [action_ids]}
        self._lock = threading.Lock()
        self.expiry_minutes = expiry_minutes
    
    def create_action(self, user_id: str, action_type: str, params: dict) -> str:
        """
        Create a new pending action
        
        Args:
            user_id: User ID
            action_type: Type of action (e.g., 'log_water', 'log_meal')
            params: Parameters for the action
            
        Returns:
            action_id: Unique identifier for this action
        """
        action_id = str(uuid.uuid4())[:8]  # Short ID
        
        with self._lock:
            self._store[action_id] = {
                'user_id': user_id,
                'action_type': action_type,
                'params': params,
                'created_at': datetime.utcnow()
            }
            
            # Add to user index
            if user_id not in self._user_index:
                self._user_index[user_id] = []
            self._user_index[user_id].append(action_id)
        
        # Clean up expired actions
        self._cleanup_expired()
        
        return action_id
    
    def get_latest_action_for_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the most recent pending action for a user
        
        Args:
            user_id: User ID
            
        Returns:
            Action data with action_id, or None if no pending actions
        """
        with self._lock:
            action_ids = self._user_index.get(user_id, [])
            
            if not action_ids:
                return None
            
            # Get the most recent non-expired action
            cutoff = datetime.utcnow() - timedelta(minutes=self.expiry_minutes)
            
            for action_id in reversed(action_ids):  # Most recent first
                action = self._store.get(action_id)
                if action and action['created_at'] >= cutoff:
                    return {**action, 'action_id': action_id}
            
            return None
    
    def get_action(self, action_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a pending action by ID
        
        Args:
            action_id: Action identifier
            
        Returns:
            Action data or None if not found/expired
        """
        with self._lock:
            action = self._store.get(action_id)
            
            if not action:
                return None
            
            # Check if expired
            if datetime.utcnow() - action['created_at'] > timedelta(minutes=self.expiry_minutes):
                self._remove_action_internal(action_id)
                return None
            
            return action
    
    def remove_action(self, action_id: str) -> bool:
        """
        Remove a pending action after execution
        
        Args:
            action_id: Action identifier
            
        Returns:
            True if removed, False if not found
        """
        with self._lock:
            return self._remove_action_internal(action_id)
    
    def _remove_action_internal(self, action_id: str) -> bool:
        """Internal remove without lock (must be called with lock held)"""
        if action_id in self._store:
            action = self._store[action_id]
            user_id = action['user_id']
            
            # Remove from store
            del self._store[action_id]
            
            # Remove from user index
            if user_id in self._user_index:
                self._user_index[user_id] = [
                    aid for aid in self._user_index[user_id] if aid != action_id
                ]
                if not self._user_index[user_id]:
                    del self._user_index[user_id]
            
            return True
        return False
    
    def _cleanup_expired(self):
        """Remove expired actions (called automatically)"""
        cutoff = datetime.utcnow() - timedelta(minutes=self.expiry_minutes)
        
        with self._lock:
            expired = [
                aid for aid, action in self._store.items()
                if action['created_at'] < cutoff
            ]
            
            for aid in expired:
                self._remove_action_internal(aid)


# Global instance
pending_actions = PendingActionsStore(expiry_minutes=10)
