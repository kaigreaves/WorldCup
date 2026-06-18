import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        // Enable native iOS rubber-band scroll bounce on the WKWebView.
        // Without this the WebView scroll comes to a dead stop at the top/bottom.
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
    }
}
