import { v4 as uuidv4 } from "uuid";

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
    destroy();

    /**
     * Fire an event synchronously.
     * After the method returns all subscribers have been invoked.
     * @param eventType
     * @param data
     */
    fire<T extends keyof Events>(eventType: T, data?: Events[T]);
}

export interface EventBusReceiver<Events extends BusEventMap<Events> = BusEventMap<any>> {
    destroy();

    on<T extends keyof Events>(event: T | T[], handler: (event: BusEvent<Events, T>) => void) : () => void;
    one<T extends keyof Events>(event: T | T[], handler: (event: BusEvent<Events, T>) => void) : () => void;

    off(handler: (event: BusEvent<Events, keyof Events>) => void);
    off<T extends keyof Events>(events: T | T[], handler: (event: BusEvent<Events, T>) => void);

    onAll(handler: (event: BusEvent<Events, keyof Events>) => void) : () => void;
    offAll(handler: (event: BusEvent<Events, keyof Events>) => void);

    registerHandler(handler: any, parentClasses?: boolean);
    unregisterHandler(handler: any);
}

export const kEventAnnotationKey = uuidv4();

/**
 * Annotation type for TypeScript.
 * This type must be present if you're calling `registerHandler`
 * @param events
 * @constructor
 */
export function EventHandler<Events extends BusEventMap<Events> = BusEventMap<any>>(events: (keyof Events) | (keyof Events)[]) {
    return function (target: any, propertyKey: string, _descriptor: PropertyDescriptor) {
        if(typeof target[propertyKey] !== "function") {
            throw "Invalid event handler annotation. Expected to be on a function type.";
        }

        target[propertyKey][kEventAnnotationKey] = {
            events: Array.isArray(events) ? events : [ events ]
        };
    }
}