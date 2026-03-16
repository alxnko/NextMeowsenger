from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.goto("http://localhost:3000")
        page.wait_for_timeout(2000)
        page.screenshot(path="/home/jules/verification/verification.png")
        print("Done")
        context.close()
        browser.close()

if __name__ == "__main__":
    verify()
