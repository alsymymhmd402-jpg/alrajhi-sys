package org.alwaleed.customer;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;

public final class MainActivity extends AppCompatActivity {
    private static final String START_URL = "https://voicecall-uwxhmyez.manus.space/client/start";
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setStatusBarColor(Color.rgb(7, 26, 21));
        getWindow().setNavigationBarColor(Color.rgb(5, 20, 16));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(6, 20, 16));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                setContentView(new WebView(MainActivity.this));
                Toast.makeText(MainActivity.this, "تمت إعادة تشغيل واجهة التطبيق", Toast.LENGTH_SHORT).show();
                recreate();
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) view.loadDataWithBaseURL(START_URL,
                    "<html dir='rtl'><body style='background:#061410;color:#effff8;font-family:sans-serif;text-align:center;padding:48px'><h2>تعذر الاتصال</h2><p>تحقق من الإنترنت ثم أعد المحاولة.</p></body></html>", "text/html", "UTF-8", null);
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        setContentView(webView);
        if (state == null) webView.loadUrl(START_URL); else webView.restoreState(state);
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        if (webView != null) webView.saveState(out);
        super.onSaveInstanceState(out);
    }
    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if (webView != null) { webView.stopLoading(); webView.setWebChromeClient(null); webView.setWebViewClient(null); webView.destroy(); }
        super.onDestroy();
    }
}
