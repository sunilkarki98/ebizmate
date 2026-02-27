import { z } from "zod";

export const AddToCartSchema = z.object({
    productId: z.string().describe("The exact ID of the item the customer wants to buy. Found in the Knowledge Base."),
    productName: z.string().describe("Name of the product"),
    price: z.number().describe("Price of the product"),
    quantity: z.number().min(1).default(1).describe("Number of units"),
});

export const CheckoutSchema = z.object({
    customerPhone: z.string().describe("The customer's phone number"),
    deliveryAddress: z.string().optional().describe("Delivery address if applicable"),
    notes: z.string().optional().describe("Additional order notes from the customer"),
});

export const RequestDiscountSchema = z.object({
    productId: z.string().describe("The ID of the item the customer wants a discount on"),
    productName: z.string().describe("Name of the product"),
    requestedDiscountPercentage: z.number().min(1).max(100).describe("The numerical percentage discount the customer is asking for (e.g. 10 for 10%)"),
});

export const CheckOrderStatusSchema = z.object({
    orderId: z.string().optional().describe("The specific order ID, if the customer provided one"),
});

export const ShowProductCarouselSchema = z.object({
    itemIds: z.array(z.string()).describe("Array of Knowledge Base item IDs to show in the carousel"),
});

export const CustomerToolDefinitions = [
    {
        name: "add_to_cart",
        description: "Add an item from the Knowledge Base to the customer's virtual shopping cart. PROACTIVE USAGE: Call this tool proactively the moment a customer says they want a specific item (e.g., 'I want the red one', 'size M please', 'I'll take it'). Do NOT wait for them to explicitly say 'add to cart'.",
        parameters: {
            type: "object",
            properties: {
                productId: { type: "string", description: "The exact ID of the item the customer wants to buy. Found in the Knowledge Base." },
                productName: { type: "string", description: "Name of the product" },
                price: { type: "number", description: "Price of the product" },
                quantity: { type: "number", description: "Number of units" }
            },
            required: ["productId", "productName", "price", "quantity"]
        }
    },
    {
        name: "checkout",
        description: "Complete the order process. Call this ONLY AFTER the cart has items AND you have collected the customer's phone number.",
        parameters: {
            type: "object",
            properties: {
                customerPhone: { type: "string", description: "The customer's phone number" },
                deliveryAddress: { type: "string", description: "Delivery address if applicable" },
                notes: { type: "string", description: "Additional order notes from the customer" }
            },
            required: ["customerPhone"]
        }
    },
    {
        name: "show_product_carousel",
        description: "Display a visual carousel/gallery of products to the customer. Call this when the customer asks to see options, browse products, or asks what you have available, and you have found relevant items in the Knowledge Base.",
        parameters: {
            type: "object",
            properties: {
                itemIds: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of Knowledge Base item IDs to show in the carousel"
                }
            },
            required: ["itemIds"]
        }
    },
    {
        name: "request_discount",
        description: "Request manager approval for a discount. Call this ONLY when a customer directly asks for a discount or price reduction that is NOT already explicitly mentioned in your Knowledge Base. You cannot authorize unlisted discounts yourself.",
        parameters: {
            type: "object",
            properties: {
                productId: { type: "string", description: "The ID of the item the customer wants a discount on" },
                productName: { type: "string", description: "Name of the product" },
                requestedDiscountPercentage: { type: "number", description: "The numerical percentage discount the customer is asking for (e.g. 10 for 10%)" }
            },
            required: ["productId", "productName", "requestedDiscountPercentage"]
        }
    },
    {
        name: "check_order_status",
        description: "Check the status and tracking URL of an existing order. Call this when the customer asks 'Where is my order?', 'Has my stuff shipped?', or similar.",
        parameters: {
            type: "object",
            properties: {
                orderId: { type: "string", description: "The specific order ID, if the customer provided one (otherwise leave blank to find their latest order)" }
            }
        }
    }
];

export type AddToCartParams = z.infer<typeof AddToCartSchema>;
export type CheckoutParams = z.infer<typeof CheckoutSchema>;
export type ShowProductCarouselParams = z.infer<typeof ShowProductCarouselSchema>;
export type RequestDiscountParams = z.infer<typeof RequestDiscountSchema>;
export type CheckOrderStatusParams = z.infer<typeof CheckOrderStatusSchema>;
