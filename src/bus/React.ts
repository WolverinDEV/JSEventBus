import {BusEvent, BusEventMap, EventBusReceiver} from "../index";
import {DefaultAsyncEventBusSender, OrderedAsyncEventBusSender} from "./Async";
import {unstable_batchedUpdates} from "react-dom";
import {useEffect} from "react";
import {EventBus, SimpleEventBusReceiver} from "./Simple";

export interface ReactEventBusSender<Events extends BusEventMap<Events> = BusEventMap<any>>
    extends OrderedAsyncEventBusSender<Events> {

    /**
     * Fire an event which will cause a react component to update.
     * @param eventType The target event to be fired
     * @param data The payload of the event
     * @param callback The callback will be called after the event has been successfully dispatched
     */
    fireReact<T extends keyof Events>(eventType: T, data?: Events[T], callback?: () => void);
}

export interface ReactEventBusReceiver<Events extends BusEventMap<Events> = BusEventMap<any>>
    extends EventBusReceiver<Events> {

    /**
     * @param event
     * @param handler
     * @param condition If a boolean the event handler will only be registered if the condition is true
     * @param reactEffectDependencies
     */
    reactUse<T extends keyof Events>(event: T | T[], handler: (event: BusEvent<Events, T>) => void, condition?: boolean, reactEffectDependencies?: any[]);
}

export type ReactEventBus<Events extends BusEventMap<Events>> = EventBus<Events> & OrderedAsyncEventBusSender<Events>;

export class DefaultReactEventBusSender<Events extends BusEventMap<Events> = BusEventMap<any>>
    extends DefaultAsyncEventBusSender<Events> implements ReactEventBusSender {

    private pendingReactTimeout: number;
    private pendingReactEvents: { eventType: any, payload: any, callback: () => void | undefined }[];

    destroy() {
        super.destroy();

        if(window.cancelAnimationFrame) {
            cancelAnimationFrame(this.pendingReactTimeout);
        }

        this.pendingReactTimeout = undefined;
        this.pendingReactEvents = undefined;
    }

    fireReact<T extends keyof BusEventMap<any>>(eventType: T, payload?: BusEventMap<any>[T], callback?: () => void) {
        if(!this.pendingReactTimeout) {
            this.pendingReactTimeout = requestAnimationFrame(() => this.firePendingReactEvents());
            this.pendingReactEvents = [];
        }

        this.pendingReactEvents.push({ eventType, payload, callback });
    }

    private firePendingReactEvents() {
        const callbacks = this.pendingReactEvents;
        this.pendingReactTimeout = 0;
        this.pendingReactEvents = undefined;

        /* run this after the requestAnimationFrame has been finished since else it might be fired instantly */
        setTimeout(() => {
            /* batch all react updates */
            unstable_batchedUpdates(() => {
                let index = 0;
                while(index < callbacks.length) {
                    this.fire(callbacks[index].eventType, callbacks[index].payload);

                    try {
                        if(callbacks[index].callback) {
                            callbacks[index].callback();
                        }
                    } catch (error) {
                        console.error(error);
                        /* TODO: Improve error handling */
                    }

                    index++;
                }
            });
        });
    }
}

export class DefaultReactEventBusReceiver<Events extends BusEventMap<Events> = BusEventMap<any>>
    extends SimpleEventBusReceiver<Events> implements ReactEventBusReceiver<any> {

    reactUse(event, handler, condition?, reactEffectDependencies?) {
        if(typeof condition === "boolean" && !condition) {
            useEffect(() => {});
            return;
        }

        const handlers = this.persistentEventHandler[event as any] || (this.persistentEventHandler[event as any] = []);

        useEffect(() => {
            handlers.push(handler);
            return () => {
                const index = handlers.findIndex(handler);
                if(index !== -1) {
                    handlers.splice(index, 1);
                }
            };
        }, reactEffectDependencies);
    }
}