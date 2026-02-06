/**
 * Centralized exports for API services
 * Import services from here to keep imports clean
 *
 * @example
 * import { authService, userService } from "@/api/services";
 */

export {authService} from "./authService";
export {userService} from "./userService";
export {publicService} from "./publicService";
export {courseService} from "./courseService";
export {videoService} from "./videoService";

// Re-export types for convenience
export type {InitVideoParams, ConfirmVideoParams, PublishVideoParams, DeleteVideoParams} from "./videoService";
