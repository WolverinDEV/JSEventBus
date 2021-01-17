/*
export interface Event<Events, T = keyof Events> {
    readonly type: T;

    as<T extends keyof Events>() : Events[T];
}
*/

export type BusEventPayloadObject = {
    [key: string]: BusEventPayload
} | {
    [key: number]: BusEventPayload
};

export type BusEventPayload = string | number | bigint | null | undefined | BusEventPayloadObject;

export type BusEventMap<P> = {
    [K in keyof P]: BusEventPayloadObject & {
        /* prohibit the type attribute on the highest layer (used to identify the event type) */
        type?: never
    }
};

export type BusEvent<P extends BusEventMap<P>, T extends keyof P> = {
    readonly type: T,

    as<S extends T>(target: S) : BusEvent<P, S>;
    asUnchecked<S extends T>(target: S) : BusEvent<P, S>;
    asAnyUnchecked<S extends keyof P>(target: S) : BusEvent<P, S>;

    /**
     * Return an object containing only the event payload specific key value pairs.
     */
    extractPayload() : P[T];
} & P[T];

export interface EventBusSender<Events extends BusEventMap<Events> = BusEventMap<any>> {
    /**
     * Fire an event synchronously.
     * After the method returns all subscribers have been invoked.
     * @param eventType
     * @param data
     */
    fire<T extends keyof Events>(eventType: T, data?: Events[T]);
}

/**
 * Async event bus sender.
 * The order the events might get dispatched can be out of order!
 */
export interface AsyncEventBusSender<Events extends BusEventMap<Events> = BusEventMap<any>> {
    /**
     * Fire an event asynchronously without blocking.
     * @param eventType The target event to be fired
     * @param data The payload of the event
     * @param callback The callback will be called after the event has been successfully dispatched
     */
    fireAsync<T extends keyof Events>(eventType: T, data?: Events[T], callback?: () => void);

    /**
     * @returns true if the async events will be dispatched in order,
     *          else false will be returned.
     */
    isOrdered() : boolean;
}

/**
 * Async event bus sender but with guaranteed async emit order.
 */
export interface OrderedAsyncEventBusSender<Events extends BusEventMap<Events> = BusEventMap<any>>
    extends AsyncEventBusSender<Events> {

    isOrdered() : true;
}

export interface EventBusReceiver<Events extends BusEventMap<Events> = BusEventMap<any>> {
    on<T extends keyof Events>(event: T | T[], handler: (event: BusEvent<Events, T>) => void) : () => void;
    one<T extends keyof Events>(event: T | T[], handler: (event: BusEvent<Events, T>) => void) : () => void;

    off(handler: (event: BusEvent<Events, keyof Events>) => void);
    off<T extends keyof Events>(events: T | T[], handler: (event: BusEvent<Events, T>) => void);

    onAll(handler: (event: BusEvent<Events, keyof Events>) => void) : () => void;
    offAll(handler: (event: BusEvent<Events, keyof Events>) => void);
}


export type EventBus<Events extends BusEventMap<Events>> = EventBusReceiver<Events> & EventBusSender<Events>;
export type AsyncEventBus<Events extends BusEventMap<Events>> = EventBus<Events> & AsyncEventBusSender<Events>;
export type OrderedAsyncEventBus<Events extends BusEventMap<Events>> = EventBus<Events> & OrderedAsyncEventBusSender<Events>;