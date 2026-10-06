/*
 * SnapTools AdMob configuration
 *
 * IMPORTANT — READ BEFORE CHANGING:
 *
 * Keep USE_TEST_ADS = true for ALL development and for every build you
 * install on your own phone. Tapping your own live ads, even once, gets
 * AdMob accounts permanently banned. Google's fraud detection is automated
 * and appeals rarely succeed.
 *
 * Set USE_TEST_ADS = false ONLY in the release build you upload to the
 * Play production track, and never sideload that build onto your own device.
 *
 * The test IDs below are Google's official public test units. They always
 * fill, they earn nothing, and they are safe to click.
 * https://developers.google.com/admob/android/test-ads
 */

window.SNAPTOOLS_USE_TEST_ADS = true;

const SNAPTOOLS_TEST_ADS = {
  APP_ID:         "ca-app-pub-3940256099942544~3347511713",
  BANNER_ID:      "ca-app-pub-3940256099942544/6300978111",
  INTERSTITIAL_ID:"ca-app-pub-3940256099942544/1033173712",
  REWARDED_ID:    "ca-app-pub-3940256099942544/5224354917"
};

const SNAPTOOLS_LIVE_ADS = {
  APP_ID:         "ca-app-pub-4629035871778268~6034680409",
  BANNER_ID:      "ca-app-pub-4629035871778268/6135761918",
  INTERSTITIAL_ID:"ca-app-pub-4629035871778268/5024851061",
  REWARDED_ID:    "ca-app-pub-4629035871778268/5369475154"
};

window.SNAPTOOLS_ADMOB = window.SNAPTOOLS_USE_TEST_ADS
  ? SNAPTOOLS_TEST_ADS
  : SNAPTOOLS_LIVE_ADS;

console.log(
  "[SnapTools] AdMob config loaded —",
  window.SNAPTOOLS_USE_TEST_ADS ? "TEST ads (safe)" : "LIVE ads (do NOT tap)"
);
