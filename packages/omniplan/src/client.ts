/**
 * OmniPlan HTTP Client SDK.
 * Auto-generated - do not edit.
 *
 * @packageDocumentation
 */

import { ProjectResourceClient } from './resources/project.js';
import { TaskResourceClient } from './resources/task.js';
import { MilestoneResourceClient } from './resources/milestone.js';
import { ResourceResourceClient } from './resources/resource.js';
import { AssignmentResourceClient } from './resources/assignment.js';
import { DependencyResourceClient } from './resources/dependency.js';
import { ViolationResourceClient } from './resources/violation.js';
import { ScenarioResourceClient } from './resources/scenario.js';
import { ScheduleResourceClient } from './resources/schedule.js';
import { CurrencyResourceClient } from './resources/currency.js';


/**
 * Client configuration options.
 */
export interface OmniPlanClientOptions {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for API server (default: http://localhost:8372) */
  baseUrl?: string;
}

/**
 * HTTP client wrapper for making authenticated requests.
 */
export class HttpClient {
  readonly #baseUrl: string;
  readonly #apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.#baseUrl = baseUrl;
    this.#apiKey = apiKey;
  }

  /**
   * Make an authenticated POST request to an RPC endpoint.
   */
  async rpc<T>(path: string, body: object = {}): Promise<T> {
    const url = `${this.#baseUrl}/api/v1/rpc/${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { code?: string; message?: string } };
      const code = error.error?.code ?? 'UNKNOWN_ERROR';
      const message = error.error?.message ?? `HTTP ${String(response.status)}`;
      throw new OmniPlanError(code, message);
    }

    const result = await response.json() as { result: T };
    return result.result;
  }
}

/**
 * Error class for OmniPlan API errors.
 */
export class OmniPlanError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'OmniPlanError';
    this.code = code;
  }
}

/**
 * OmniPlan client for HTTP-based macOS automation.
 *
 * @example
 * ```typescript
 * const client = new OmniPlanClient({
 *   apiKey: process.env.MACTS_API_KEY!,
 * });
 *
 * // List calendars
 * const calendars = await client.calendars.list();
 * ```
 */
export class OmniPlanClient {
  readonly #httpClient: HttpClient;

  /** An OmniPlan project */
  readonly projects: ProjectResourceClient;

  /** A task within an OmniPlan project */
  readonly tasks: TaskResourceClient;

  /** A milestone (zero-duration marker task) */
  readonly milestones: MilestoneResourceClient;

  /** A resource (person, equipment, or material) */
  readonly resources: ResourceResourceClient;

  /** An assignment of a resource to a task */
  readonly assignments: AssignmentResourceClient;

  /** A dependency of one task upon another task */
  readonly dependencies: DependencyResourceClient;

  /** A scheduling conflict or issue */
  readonly violations: ViolationResourceClient;

  /** An alternative project plan */
  readonly scenarios: ScenarioResourceClient;

  /** A schedule of working time */
  readonly schedules: ScheduleResourceClient;

  /** A locale based currency object */
  readonly currencies: CurrencyResourceClient;

  constructor(options: OmniPlanClientOptions) {
    const baseUrl = options.baseUrl ?? 'http://localhost:8372';
    this.#httpClient = new HttpClient(baseUrl, options.apiKey);
    this.projects = new ProjectResourceClient(this.#httpClient, 'omniplan', 'projects');
    this.tasks = new TaskResourceClient(this.#httpClient, 'omniplan', 'tasks');
    this.milestones = new MilestoneResourceClient(this.#httpClient, 'omniplan', 'milestones');
    this.resources = new ResourceResourceClient(this.#httpClient, 'omniplan', 'resources');
    this.assignments = new AssignmentResourceClient(this.#httpClient, 'omniplan', 'assignments');
    this.dependencies = new DependencyResourceClient(this.#httpClient, 'omniplan', 'dependencies');
    this.violations = new ViolationResourceClient(this.#httpClient, 'omniplan', 'violations');
    this.scenarios = new ScenarioResourceClient(this.#httpClient, 'omniplan', 'scenarios');
    this.schedules = new ScheduleResourceClient(this.#httpClient, 'omniplan', 'schedules');
    this.currencies = new CurrencyResourceClient(this.#httpClient, 'omniplan', 'currencies');
  }

  /**
   * Get the HTTP client for making custom requests.
   */
  get http(): HttpClient {
    return this.#httpClient;
  }

  /**
   * Export a document
   */
  async _export(to: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('omniplan.app.export', { to });
  }


  /**
   * Assign resources to tasks
   */
  async assign(resource: string, task: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('omniplan.app.assign', { resource, task });
  }


  /**
   * Create a dependency between tasks
   */
  async depend(prerequisite: string, dependent: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('omniplan.app.depend', { prerequisite, dependent });
  }


  /**
   * Commit the current schedule as the baseline schedule
   */
  async baseline(): Promise<void> {
    await this.#httpClient.rpc<undefined>('omniplan.app.baseline', {});
  }


  /**
   * Level resources on project
   */
  async level(): Promise<void> {
    await this.#httpClient.rpc<undefined>('omniplan.app.level', {});
  }


  /**
   * Look up a task via a custom data key
   */
  async lookup(key: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('omniplan.app.lookup', { key });
  }


  /**
   * Make a change tracking mark on project
   */
  async changeMark(): Promise<void> {
    await this.#httpClient.rpc<undefined>('omniplan.app.changeMark', {});
  }


  /**
   * Add working hours to a schedule
   */
  async addWorkTime(schedule: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('omniplan.app.addWorkTime', { schedule });
  }


  /**
   * Remove working hours from a schedule
   */
  async subtractWorkTime(schedule: string): Promise<void> {
    await this.#httpClient.rpc<undefined>('omniplan.app.subtractWorkTime', { schedule });
  }


  /**
   * Undo the last command
   */
  async undo(): Promise<void> {
    await this.#httpClient.rpc<undefined>('omniplan.app.undo', {});
  }


  /**
   * Redo the last undone command
   */
  async redo(): Promise<void> {
    await this.#httpClient.rpc<undefined>('omniplan.app.redo', {});
  }
}
