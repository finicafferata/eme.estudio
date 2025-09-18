import { FrameSize } from '@prisma/client'

/**
 * Frame size capacity calculation for EME Studio
 *
 * Business Rules:
 * - Maximum 6 people per class (equipment constraint: frames + tufting guns)
 * - Frame sizes don't affect space calculation (each person takes 1 spot)
 * - Frame sizes are for tracking purposes and student selection
 */

export interface FrameCapacityInfo {
  small: number
  medium: number
  large: number
  total: number
}

export interface CapacityResult {
  hasCapacity: boolean
  availableSpots: number
  currentFrameDistribution: FrameCapacityInfo
  message?: string
}

/**
 * Calculate if class has capacity for new reservation
 * @param existingReservations Array of frame sizes from current reservations
 * @param maxCapacity Maximum class capacity (usually 6)
 * @param newFrameSize Frame size for new reservation
 * @returns CapacityResult with availability info
 */
export function calculateClassCapacity(
  existingReservations: FrameSize[],
  maxCapacity: number = 6,
  newFrameSize?: FrameSize
): CapacityResult {
  const currentCount = existingReservations.length
  const totalAfterAddition = newFrameSize ? currentCount + 1 : currentCount

  // Count current frame distribution
  const currentFrameDistribution: FrameCapacityInfo = {
    small: existingReservations.filter(size => size === FrameSize.SMALL).length,
    medium: existingReservations.filter(size => size === FrameSize.MEDIUM).length,
    large: existingReservations.filter(size => size === FrameSize.LARGE).length,
    total: currentCount
  }

  const availableSpots = Math.max(0, maxCapacity - currentCount)
  const hasCapacity = totalAfterAddition <= maxCapacity

  let message = ''
  if (!hasCapacity && newFrameSize) {
    message = `Class is at capacity (${currentCount}/${maxCapacity}). Cannot add ${newFrameSize.toLowerCase()} frame.`
  } else if (availableSpots === 1) {
    message = 'Only 1 spot remaining'
  } else if (availableSpots <= 3) {
    message = `${availableSpots} spots remaining`
  }

  return {
    hasCapacity,
    availableSpots,
    currentFrameDistribution,
    message
  }
}

/**
 * Check if adding a specific frame size would exceed capacity
 * @param existingReservations Current reservations with frame sizes
 * @param newFrameSize Frame size to add
 * @param maxCapacity Maximum capacity
 * @returns boolean indicating if addition is allowed
 */
export function canAddFrameSize(
  existingReservations: FrameSize[],
  newFrameSize: FrameSize,
  maxCapacity: number = 6
): boolean {
  return calculateClassCapacity(existingReservations, maxCapacity, newFrameSize).hasCapacity
}

/**
 * Get formatted capacity status for display
 * @param existingReservations Current reservations
 * @param maxCapacity Maximum capacity
 * @returns Formatted string for UI display
 */
export function getCapacityStatus(
  existingReservations: FrameSize[],
  maxCapacity: number = 6
): string {
  const result = calculateClassCapacity(existingReservations, maxCapacity)
  const { currentFrameDistribution, availableSpots } = result

  if (availableSpots === 0) {
    return `FULL (${currentFrameDistribution.total}/${maxCapacity})`
  }

  return `${currentFrameDistribution.total}/${maxCapacity} - ${availableSpots} spots available`
}