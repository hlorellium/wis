/**
 * Handles rendering-related side effects triggered by command execution
 * Subscribes to EventBus and manages cache invalidation and re-rendering
 */

import { eventBus, type CommandExecutedEvent } from '../utils/eventBus';
import { logger } from '../utils/logger';
import type { Path2DRenderer } from './path2DRenderer';

export class RenderingEventHandler {
    private renderer: Path2DRenderer;
    private unsubscribe?: () => void;

    constructor(renderer: Path2DRenderer) {
        this.renderer = renderer;
    }

    /**
     * Start listening to command events and handle rendering side effects
     */
    start(): void {
        // Subscribe to command executed events
        const unsubscribeCommandExecuted = eventBus.subscribe<CommandExecutedEvent>('commandExecuted', (event) => {
            this.handleCommandExecuted(event);
        });
        
        // Subscribe to state changed events (for undo/redo cache invalidation)
        const unsubscribeStateChanged = eventBus.subscribe<{ source: string }>('stateChanged', (event) => {
            this.handleStateChanged(event);
        });
        
        // Combine unsubscribe functions
        this.unsubscribe = () => {
            unsubscribeCommandExecuted();
            unsubscribeStateChanged();
        };
        
        logger.info('RenderingEventHandler started', 'RenderingEventHandler');
    }

    /**
     * Stop listening to events
     */
    stop(): void {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = undefined;
        }
        
        logger.info('RenderingEventHandler stopped', 'RenderingEventHandler');
    }

    /**
     * Handle command executed events by processing side effects
     */
    private handleCommandExecuted(event: CommandExecutedEvent): void {
        const { command, affectedShapeIds, sideEffects, source } = event;
        
        logger.debug(
            `Handling side effects for ${source} command: ${command.constructor.name}`,
            'RenderingEventHandler',
            { affectedShapeIds, sideEffects: sideEffects.map(se => se.type) }
        );

        // Process each side effect
        sideEffects.forEach(sideEffect => {
            switch (sideEffect.type) {
                case 'cacheInvalidation':
                    this.handleCacheInvalidation(sideEffect.target, affectedShapeIds);
                    break;
                    
                case 'rendering':
                    this.handleRendering();
                    break;
                    
                case 'persistence':
                    // Could be handled by a separate PersistenceEventHandler
                    logger.debug('Persistence side effect detected', 'RenderingEventHandler');
                    break;
                    
                case 'sync':
                    // Could be handled by a separate SyncEventHandler
                    logger.debug('Sync side effect detected', 'RenderingEventHandler');
                    break;
                    
                default:
                    logger.warn(`Unknown side effect type: ${sideEffect.type}`, 'RenderingEventHandler');
            }
        });
    }

    /**
     * Handle cache invalidation side effects
     */
    private handleCacheInvalidation(target?: string, affectedShapeIds?: string[]): void {
        if (target) {
            // Clear cache for specific shape
            this.renderer.clearCache(target);
            logger.debug(`Cleared cache for shape: ${target}`, 'RenderingEventHandler');
        } else if (affectedShapeIds && affectedShapeIds.length > 0) {
            // Clear cache for all affected shapes
            affectedShapeIds.forEach(shapeId => {
                this.renderer.clearCache(shapeId);
                logger.debug(`Cleared cache for affected shape: ${shapeId}`, 'RenderingEventHandler');
            });
        } else {
            // Clear all cache if no specific target
            this.renderer.clearCache();
            logger.debug('Cleared all cache', 'RenderingEventHandler');
        }
    }

    /**
     * Handle state changed events (from undo/redo operations)
     */
    private handleStateChanged(event: { source: string }): void {
        logger.debug(`Handling state change from: ${event.source}`, 'RenderingEventHandler');
        
        // Clear entire cache for undo/redo operations to ensure shapes are re-rendered
        // with their correct positions after state changes
        if (event.source === 'undo' || event.source === 'redo') {
            this.renderer.clearCache();
            logger.debug(`Cleared all cache due to ${event.source} operation`, 'RenderingEventHandler');
        }
    }

    /**
     * Handle rendering side effects
     */
    private handleRendering(): void {
        // The actual re-render will be triggered by the main render loop
        // This could potentially trigger an immediate re-render if needed
        logger.debug('Rendering invalidated', 'RenderingEventHandler');
    }
}
