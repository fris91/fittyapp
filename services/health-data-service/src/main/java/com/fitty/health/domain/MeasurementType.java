package com.fitty.health.domain;

/**
 * Distinguishes the kind of body data a snapshot carries.
 *
 * <p>The redesigned body-tracking UX splits entry into two dedicated screens; this lets the
 * history and trends separate tape measurements from smart-scale composition values. Legacy
 * snapshots created before the split default to {@link #WELLNESS}.
 */
public enum MeasurementType {
    /** Anthropometric tape measurements (weight, height, circumferences). */
    PHYSICAL_MEASUREMENT,
    /** Smart-scale / bioimpedance values (body fat %, muscle, water, BMR, ...). */
    BODY_COMPOSITION,
    /** Legacy / mixed wellness snapshot (mood, energy, sleep, steps). */
    WELLNESS
}
