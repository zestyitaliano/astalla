import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { type AxiosInstance } from "axios";

interface EntrataCredential {
  apiKey: string;
  orgSlug: string;
}

interface EntrataLeadParams {
  propertyId: number;
  from: Date;
  to: Date;
  page?: number;
  perPage?: number;
}

interface EntrataLeadEventParams {
  propertyId: number;
  from: Date;
  to: Date;
  eventTypeIds?: string;
  page?: number;
  perPage?: number;
}

interface EntrataLead {
  applicationId: string;
  propertyId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  leadSource?: string;
  status?: string;
  createdOn?: string;
}

interface EntrataLeadEvent {
  eventId: string;
  propertyId: number;
  applicationId?: string;
  type?: string;
  date?: string;
  dateTime?: string;
  eventReason?: string;
  agentName?: string;
}

@Injectable()
export class EntrataProvider {
  private readonly logger = new Logger(EntrataProvider.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>("ENTRATA_API_BASE") ?? "https://apis.entrata.com";
  }

  async fetchLeads(credential: EntrataCredential, params: EntrataLeadParams) {
    const client = this.createClient(credential);
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 500;

    const url = `${this.baseUrl}/ext/${credential.orgSlug}/v1/leads?page_no=${page}&per_page=${perPage}`;
    const response = await client.post(url, {
      auth: { type: "apikey" },
      requestId: "astalla-control",
      method: {
        name: "getLeads",
        version: "r1",
        params: {
          propertyId: params.propertyId,
          fromDate: this.formatDate(params.from),
          toDate: this.formatDate(params.to)
        }
      }
    });

    const prospects = this.asArray(response.data?.response?.result?.prospects);
    const leads: EntrataLead[] = [];
    let countOnPage = 0;

    for (const group of prospects) {
      const leadArray = this.asArray(group?.prospect);
      for (const lead of leadArray) {
        countOnPage += 1;
        const customer = this.asArray(lead?.customers?.customer)[0] ?? {};
        leads.push({
          applicationId: String(lead?.applicationId ?? ""),
          propertyId: params.propertyId,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.cellPhoneNumber ?? customer.personalPhoneNumber,
          leadSource: lead?.leadSource,
          status: lead?.status,
          createdOn: lead?.createdOn
        });
      }
    }

    const hasMore = countOnPage === perPage;
    this.logger.debug(`Entrata leads fetched: property=${params.propertyId} page=${page} count=${countOnPage}`);
    return { leads, nextPage: hasMore ? page + 1 : undefined };
  }

  async fetchLeadEvents(credential: EntrataCredential, params: EntrataLeadEventParams) {
    const client = this.createClient(credential);
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 500;
    const url = `${this.baseUrl}/ext/${credential.orgSlug}/v1/leads?page_no=${page}&per_page=${perPage}`;

    const response = await client.post(url, {
      auth: { type: "apikey" },
      requestId: "astalla-control",
      method: {
        name: "getLeadEvents",
        version: "r1",
        params: {
          propertyId: params.propertyId,
          eventTypeIds: params.eventTypeIds,
          eventDateFrom: this.formatDate(params.from),
          eventDateTo: this.formatDate(params.to)
        }
      }
    });

    const events: EntrataLeadEvent[] = [];
    let countOnPage = 0;
    const prospects = this.asArray(response.data?.response?.result?.prospects);
    for (const prospect of prospects) {
      const applicationId = prospect?.applicationId ? String(prospect.applicationId) : undefined;
      const eventArray = this.asArray(prospect?.events?.event);
      for (const event of eventArray) {
        countOnPage += 1;
        events.push({
          eventId: String(event?.eventId ?? ""),
          propertyId: params.propertyId,
          applicationId,
          type: event?.type,
          date: event?.date,
          dateTime: event?.dateTime,
          eventReason: event?.eventReason,
          agentName: [event?.agentFirstName, event?.agentLastName].filter(Boolean).join(" ")
        });
      }
    }

    const hasMore = countOnPage === perPage;
    this.logger.debug(`Entrata events fetched: property=${params.propertyId} page=${page} count=${countOnPage}`);
    return { events, nextPage: hasMore ? page + 1 : undefined };
  }

  private createClient(credential: EntrataCredential): AxiosInstance {
    if (!credential.apiKey) {
      throw new Error("Entrata credential missing apiKey");
    }

    return axios.create({
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-Send-Pagination-Links": "1",
        "X-Api-Key": credential.apiKey
      },
      timeout: 30000
    });
  }

  private formatDate(date: Date) {
    return date.toLocaleDateString("en-US");
  }

  private asArray<T>(value: T | T[] | null | undefined) {
    if (value === null || value === undefined) {
      return [] as T[];
    }
    return Array.isArray(value) ? value : [value];
  }

  async validate(rawCredential: Record<string, unknown>) {
    try {
      const apiKey = this.getString(rawCredential.apiKey, "apiKey");
      const orgSlug = this.getString(rawCredential.orgSlug, "orgSlug");
      const propertyIdValue = rawCredential.propertyId ?? rawCredential.propertyExternalId;
      const propertyId = Number(propertyIdValue);

      if (!Number.isFinite(propertyId)) {
        throw new Error("Entrata credential missing propertyId");
      }

      const now = new Date();
      const start = new Date(now.getTime() - 60 * 60 * 1000);

      await this.fetchLeads({ apiKey, orgSlug }, { propertyId, from: start, to: now, perPage: 1 });
      return { ok: true } as const;
    } catch (error) {
      const message = (error as Error).message ?? "Unable to validate Entrata credential";
      this.logger.warn(`Entrata validation failed: ${message}`);
      return { ok: false, message } as const;
    }
  }

  private getString(value: unknown, field: string) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Missing credential field ${field}`);
    }
    return value.trim();
  }
}

export type { EntrataCredential, EntrataLead, EntrataLeadEvent };
