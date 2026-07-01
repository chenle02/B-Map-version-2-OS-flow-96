package com.chenboda01.bmapv2osflow96;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final int LOCATION_REQUEST_CODE = 96;
    private WebView webView;
    private LocationManager locationManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        webView = new WebView(this);
        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new AndroidLocationBridge(), "AndroidLocation");
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setGeolocationEnabled(true);
        webView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }

    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean locationServiceOn() {
        try {
            return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) || locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception e) { return false; }
    }

    private void requestNativeLocation() {
        if (!hasLocationPermission()) {
            requestPermissions(new String[] { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }, LOCATION_REQUEST_CODE);
            return;
        }
        if (!locationServiceOn()) {
            sendLocationErrorToPage("GPS/location service is OFF. Tap Location Settings, turn it on, then come back.");
            openLocationSettings();
            return;
        }
        try {
            Location best = getBestLastKnown();
            if (best != null && best.getAccuracy() <= 5000) {
                sendLocationToPage(best);
            }
            LocationListener listener = new LocationListener() {
                @Override public void onLocationChanged(Location location) { sendLocationToPage(location); try { locationManager.removeUpdates(this); } catch(Exception e) {} }
                @Override public void onProviderEnabled(String provider) {}
                @Override public void onProviderDisabled(String provider) { sendLocationErrorToPage("GPS/location service was turned off."); }
                @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
            };
            try { locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0, 0, listener); } catch(Exception e) {}
            try { locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 0, 0, listener); } catch(Exception e) {}
            if (best == null) webView.postDelayed(() -> { Location again = getBestLastKnown(); if (again != null) sendLocationToPage(again); else sendLocationErrorToPage("Still waiting for GPS. Go outside or turn on high accuracy location."); }, 7000);
        } catch (Exception e) {
            sendLocationErrorToPage("Location failed. Turn on Location Services and try again.");
        }
    }

    private Location getBestLastKnown() {
        Location best = null;
        String[] providers = new String[] { LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER };
        for (String p : providers) {
            try {
                Location loc = locationManager.getLastKnownLocation(p);
                if (loc != null && (best == null || loc.getAccuracy() < best.getAccuracy())) best = loc;
            } catch (Exception e) {}
        }
        return best;
    }

    private void openLocationSettings() {
        try { startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)); } catch (Exception e) { try { startActivity(new Intent(Settings.ACTION_SETTINGS)); } catch(Exception x) {} }
    }

    private void sendLocationToPage(Location location) {
        final double lat = location.getLatitude();
        final double lon = location.getLongitude();
        final float acc = location.getAccuracy();
        runOnUiThread(() -> webView.evaluateJavascript("window.nativeLocationResult && window.nativeLocationResult(" + lat + "," + lon + "," + acc + ");", null));
    }

    private void sendLocationErrorToPage(String msg) {
        String safe = msg.replace("\\", "\\\\").replace("'", "\\'");
        runOnUiThread(() -> webView.evaluateJavascript("window.nativeLocationError && window.nativeLocationError('" + safe + "');", null));
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_REQUEST_CODE) {
            boolean allowed = false;
            for (int r : grantResults) if (r == PackageManager.PERMISSION_GRANTED) allowed = true;
            if (allowed) requestNativeLocation(); else sendLocationErrorToPage("Location permission denied.");
        }
    }

    @Override protected void onResume() { super.onResume(); }

    public class AndroidLocationBridge {
        @JavascriptInterface public void requestLocation() { runOnUiThread(() -> requestNativeLocation()); }
        @JavascriptInterface public void openLocationSettings() { runOnUiThread(() -> openLocationSettings()); }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}
