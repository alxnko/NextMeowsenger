from playwright.sync_api import sync_playwright
import time
import os

def verify_chat():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to benchmark page...")
        try:
            page.goto("http://localhost:3000/benchmark")
            # Wait for messages to load (wait for selector msg-0)
            page.wait_for_selector("div[id^='msg-']", timeout=10000)

            print("Taking screenshot of benchmark page (MessageItem verification)...")
            page.screenshot(path="/home/jules/verification/benchmark_messages.png")
            print("Screenshot saved to /home/jules/verification/benchmark_messages.png")

        except Exception as e:
            print(f"Failed to verify benchmark page: {e}")

        print("Navigating to home page...")
        try:
            page.goto("http://localhost:3000")
            print("Taking screenshot of home page...")
            page.screenshot(path="/home/jules/verification/home_page.png")
            print("Screenshot saved to /home/jules/verification/home_page.png")
        except Exception as e:
            print(f"Failed to verify home page: {e}")

        browser.close()

if __name__ == "__main__":
    verify_chat()
