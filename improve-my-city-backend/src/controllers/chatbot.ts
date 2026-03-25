import { Request } from "@/types/helpers";
import { processChatMessage } from "@/services/chatbot";
import { getUser } from "@/services/user";
import { z } from "zod";

const chatMessageSchema = z.object({
    message: z.string().min(1, "Message cannot be empty").max(1000, "Message is too long"),
});

export const sendChatMessage = async (req: Request) => {
    const { userId } = req.user;
    const validatedData = chatMessageSchema.parse(req.body);

    const user = await getUser(userId);

    const response = await processChatMessage(
        validatedData.message,
        userId,
        user?.name
    );

    const shouldOpenForm = response === "__OPEN_ISSUE_FORM__";
    
    return {
        message: shouldOpenForm ? "Sure! Let's report an issue. Please fill in the details below." : response,
        timestamp: Date.now(),
        openForm: shouldOpenForm,
    };
};
