package com.chenboda01.bmapv2osflow96;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Criteria;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
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

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setGeolocationEnabled(true);

        webView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }

    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
               checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestNativeLocation() {
        if (!hasLocationPermission()) {
            requestPermissions(new String[] {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }, LOCATION_REQUEST_CODE);
            return;
        }

        try {
            Location best = null;
            String[] providers = new String[] {
                LocationManager.GPS_PROVIDER,
                LocationManager.NETWORK_PROVIDER,
                LocationManager.PASSIVE_PROVIDER
            };

            for (String provider : providers) {
                try {
                    Location loc = locationManager.getLastKnownLocation(provider);
                    if (loc != null && (best == null || loc.getAccuracy() < best.getAccuracy())) {
                        best = loc;
                    }
                } catch (Exception ignored) {}
            }

            if (best != null) {
                sendLocationToPage(best);
                return;
            }

            Criteria criteria = new Criteria();
            criteria.setAccuracy(Criteria.ACCURACY_FINE);
            String provider = locationManager.getBestProvider(criteria, true);
            if (provider == null) provider = LocationManager.NETWORK_PROVIDER;

            locationManager.requestSingleUpdate(provider, new LocationListener() {
                @Override
                public void onLocationChanged(Location location) {
                    sendLocationToPage(location);
                }

                @Override public void onProviderEnabled(String provider) {}
                @Override public void onProviderDisabled(String provider) { sendLocationErrorToPage(); }
                @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
            }, null);
        } catch (Exception e) {
            sendLocationErrorToPage();
        }
    }

    private void sendLocationToPage(Location location) {
        final double lat = location.getLatitude();
        final double lon = location.getLongitude();
        final float acc = location.getAccuracy();
        runOnUiThread(() -> webView.evaluateJavascript(
            "window.nativeLocationResult && window.nativeLocationResult(" + lat + "," + lon + "," + acc + ");",
            null
        ));
    }

    private void sendLocationErrorToPage() {
        runOnUiThread(() -> webView.evaluateJavascript(
            "window.nativeLocationError && window.nativeLocationError();",
            null
        ));
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_REQUEST_CODE) {
            boolean allowed = false;
            for (int result : grantResults) {
                if (result == PackageManager.PERMISSION_GRANTED) {
                    allowed = true;
                    break;
                }
            }
            if (allowed) requestNativeLocation();
            else sendLocationErrorToPage();
        }
    }

    public class AndroidLocationBridge {
        @JavascriptInterface
        public void requestLocation() {
            runOnUiThread(() -> requestNativeLocation());
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
