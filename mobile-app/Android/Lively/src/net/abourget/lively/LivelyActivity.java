package net.abourget.lively;

import com.phonegap.DroidGap;

import android.os.Bundle;


public class LivelyActivity extends DroidGap {

	/** Called when the activity is first created. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.loadUrl("http://lively.abourget.net/mobile/publisher.html");
        //super.loadUrl("file:///android_asset/www/lively.html");
    }
}