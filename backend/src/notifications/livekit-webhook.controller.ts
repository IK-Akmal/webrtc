import { Controller, Headers, HttpCode, Post, Req } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { WebhookReceiver } from "livekit-server-sdk";
import { NotificationsGateway } from "./notifications.gateway";

@Controller("rooms")
export class LivekitWebhookController {
  private readonly receiver: WebhookReceiver;

  constructor(
    private readonly notifications: NotificationsGateway,
    config: ConfigService,
  ) {
    const apiKey = config.get<string>("LIVEKIT_API_KEY") ?? "devkey";
    const apiSecret = config.get<string>("LIVEKIT_API_SECRET") ?? "secret";
    this.receiver = new WebhookReceiver(apiKey, apiSecret);
  }

  @Post("livekit-webhook")
  @HttpCode(200)
  async handleWebhook(
    @Headers("authorization") authHeader: string,
    @Req() req: Request,
  ): Promise<void> {
    try {
      // express.raw() middleware stores body as Buffer in req.body
      const body = Buffer.isBuffer(req.body) ? req.body.toString() : "";
      const event = await this.receiver.receive(body, authHeader);
      if (event.event === 'participant_joined' || event.event === 'participant_left') {
        const roomId = event.room?.name;
        if (!roomId) return;
        // Both events carry numParticipants *after* the change (per LiveKit server source).
        const count = event.room?.numParticipants ?? 0;
        this.notifications.emitRoomCountUpdated(roomId, count);
      }
    } catch {
      // invalid signature or malformed body — ignore
    }
  }
}
