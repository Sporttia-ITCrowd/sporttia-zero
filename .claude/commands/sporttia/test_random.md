# /test_random Command

When this command is used, execute the following task using browser automation (Playwright MCP).

## Purpose

Perform an end-to-end test of the Sporttia Zero onboarding flow by creating a sports center in a random location around the world, using the local language and region-appropriate sports.

## Browser Setup

**IMPORTANT**: Do NOT close the current browser. Use the existing Chrome browser with a new tab.

### Step 0: Use Existing Browser Tab
```
1. First, call mcp__playwright__browser_tabs with action: "list" to check existing tabs
2. If browser is already open with tabs:
   - Use mcp__playwright__browser_tabs with action: "new" to create a new tab
   - The new tab will automatically become active
3. If no browser is open:
   - Playwright will automatically launch a new browser on first navigation
4. Proceed with the test in the current/new tab
```

## Test Parameters

Before starting, randomly select:

1. **Location**: Pick a random city/country from diverse regions (Latin alphabet only):
   - Europe: Madrid, Paris, Berlin, Rome, Amsterdam, Stockholm, Warsaw, Lisbon, Prague, Vienna
   - Americas: Mexico City, Buenos Aires, Sao Paulo, Toronto, Chicago, Lima, Bogota
   - Asia: Jakarta, Manila, Hanoi (Latin alphabet languages)
   - Oceania: Sydney, Auckland

2. **Language**: Use the native language of the selected location (must use Latin alphabet)

3. **Facilities**: Random number between 1-5

4. **Sports**: Choose sports popular in that region:
   - Spain/Latin America: Padel, Tennis, Football
   - Brazil: Football, Volleyball, Beach Tennis
   - USA/Canada: Basketball, Tennis, Pickleball
   - France: Tennis, Padel, Squash
   - Germany: Tennis, Football, Handball
   - Italy: Tennis, Padel, Football, Basketball
   - Netherlands: Tennis, Football, Hockey
   - Nordic: Tennis, Badminton, Floorball
   - Portugal: Padel, Tennis, Football
   - Czech/Austria: Tennis, Squash, Badminton
   - Australia/NZ: Tennis, Cricket nets, Netball
   - Indonesia/Philippines/Vietnam: Badminton, Tennis, Futsal

5. **Email**: Generate a random email using the format `jperez+{random}@sporttia.com`
   - Generate a random alphanumeric string (8-12 characters)
   - Example: `jperez+ksd88fd6sd6f@sporttia.com`

## Playwright Execution Steps

### Step 1: Navigate to Sporttia Zero and Reset Conversation
```
1. Use mcp__playwright__browser_navigate to go to http://localhost:4501
2. Use mcp__playwright__browser_snapshot to check the page state
3. Wait for "Connected" status to appear (check for text "Connected" in the snapshot)

IMPORTANT - Check if conversation exists:
- Look for the "New conversation" button in the snapshot
- If there are message paragraphs in the chat area (not just the welcome message),
  the conversation is NOT empty and must be reset

To reset conversation:
1. Click the "New conversation" button (role: button, name: "New conversation")
2. A confirmation dialog will appear with heading "Start new conversation?"
3. Click the "Start new" button to confirm
4. Wait for the welcome message to appear with text "Welcome to Sporttia ZERO"
```

### Step 2: Start Conversation in Local Language
```
1. Find the message input textbox (role: textbox, name: "Type your message...")
2. Type a greeting + intent in the selected language:
   - Spanish: "Hola, quiero crear un centro deportivo en [city]"
   - Portuguese: "Olá, quero criar um centro esportivo em [city]"
   - French: "Bonjour, je voudrais créer un centre sportif à [city]"
   - German: "Hallo, ich möchte ein Sportzentrum in [city] erstellen"
   - Italian: "Ciao, vorrei creare un centro sportivo a [city]"
   - Dutch: "Hallo, ik wil een sportcentrum maken in [city]"
   - Swedish: "Hej, jag vill skapa ett sportcenter i [city]"
   - Polish: "Cześć, chcę utworzyć centrum sportowe w [city]"
   - Czech: "Dobrý den, chci vytvořit sportovní centrum v [city]"
   - Indonesian: "Halo, saya ingin membuat pusat olahraga di [city]"
   - Vietnamese: "Xin chào, tôi muốn tạo một trung tâm thể thao ở [city]"
   - Filipino: "Kumusta, gusto kong gumawa ng sports center sa [city]"
3. Submit with submit: true parameter
4. Wait 2-3 seconds for response using mcp__playwright__browser_wait_for with time parameter
```

### Step 3: Provide Information Flow
The assistant will ask for information in this order. Respond to each:

```
1. Admin Name → Provide culturally appropriate name
   Example names by region:
   - Spain: "Carlos García", "María López"
   - France: "Jean Dupont", "Marie Martin"
   - Germany: "Hans Müller", "Anna Schmidt"
   - Italy: "Marco Rossi", "Giulia Bianchi"
   - Brazil: "João Silva", "Ana Santos"
   - Netherlands: "Jan de Vries", "Anna Bakker"
   - Sweden: "Erik Lindqvist", "Anna Johansson"
   - Poland: "Jan Kowalski", "Anna Nowak"
   - Portugal: "António Silva", "Maria Santos"
   - Indonesia: "Budi Santoso", "Siti Rahayu"
   - Vietnam: "Nguyen Van Minh", "Tran Thi Lan"
   - Philippines: "Juan dela Cruz", "Maria Santos"

2. Sports Center Name → Local language name
   Examples:
   - Spain: "Centro Deportivo [Name]", "Club Deportivo [Name]"
   - France: "Centre Sportif [Name]"
   - Germany: "Sportzentrum [Name]"
   - Italy: "Centro Sportivo [Name]"
   - Portugal: "Centro Desportivo [Name]"
   - Netherlands: "Sportcentrum [Name]"
   - Sweden: "Sportcenter [Name]"
   - Indonesia: "Pusat Olahraga [Name]"
   - Vietnam: "Trung tâm thể thao [Name]"

3. Email → Use the generated jperez+{random}@sporttia.com email

4. City → Confirm the city (assistant may auto-detect from greeting)

5. Facilities → Provide ALL facilities in ONE message:
   Format: "[count] [sport] courts/fields, open [start]-[end], [duration] min slots, [price] [currency]"

   Example (Spanish):
   "Tenemos 2 pistas de pádel de 09:00-22:00 con turnos de 90 minutos a 24€,
    y 1 pista de tenis de 08:00-21:00 con turnos de 60 minutos a 18€"

   Example (Indonesian):
   "Kami punya 2 lapangan badminton buka 08:00-22:00 durasi 60 menit harga 50.000 IDR"

   Pricing guidelines by region:
   - Spain/Europe: 15-40€
   - USA/Canada: $20-50
   - Brazil: R$30-100
   - Indonesia: 50.000-150.000 IDR
   - Vietnam: 100.000-300.000 VND
   - Philippines: 300-800 PHP

6. Confirm creation → Say "yes/confirm" in local language when asked
```

### Step 4: Wait for Success and Submit Feedback
```
1. After confirmation, wait 3-5 seconds for the sports center to be created
2. Look for success message containing keywords like "created", "success", "creado", "créé", etc.

3. Check for Star Rating Popup:
   - Look for a modal/dialog with star icons (may not always appear)
   - If popup appears: click 4 or 5 stars, add comment, submit

4. Use Sidebar Feedback (always available):
   - Find textbox with placeholder "Write your feedback here..."
   - Type feedback in the local language (positive comment about the experience)
   - Click "Send" button
   - Verify "Thank you for your feedback!" appears
```

### Step 5: Verify City in Database
After the sports center is created successfully, verify the city was created correctly in the database:

```
1. Connect directly to MySQL via VPN:
   - Host: 10.63.48.3 (sporttia-sql-pre)
   - Database: sporttia_pre
   - User: sporttia
   - Password: trebujena

2. Query the city table to find the newly created city:
   SELECT c.id, c.name, c.province, c.country as country_id,
          p.name as province_name, co.name as country_name
   FROM city c
   LEFT JOIN province p ON c.province = p.id
   LEFT JOIN country co ON c.country = co.id
   WHERE c.name LIKE '%{city_name}%'
   ORDER BY c.id DESC
   LIMIT 5;

3. Verify the results:
   - City exists in the table
   - country_id (c.country) is NOT NULL
   - country_name matches the expected country

4. If country_id is NULL:
   - Report as FAILED in the summary
   - This indicates the Google Places API integration or LLM is not passing country correctly
```

**Database Connection (VPN required):**

Connect directly to MySQL via VPN:
```bash
mysql -h 10.63.48.3 -u sporttia -ptrebujena sporttia_pre -e "SELECT c.id, c.name, c.country, co.name as country_name FROM city c LEFT JOIN country co ON c.country = co.id WHERE c.name LIKE '%{city}%' ORDER BY c.id DESC LIMIT 5;"
```

## Key Element Patterns (from actual testing)

| Element | Selector Pattern |
|---------|------------------|
| Message input | `textbox[name="Type your message..."]` |
| Send button | `button[name="Send message"]` |
| New conversation | `button[name="New conversation"]` |
| Confirm reset | `button[name="Start new"]` |
| Cancel reset | `button[name="Cancel"]` |
| Feedback textarea | `textbox[name="Write your feedback here..."]` |
| Feedback send | `button[name="Send"]` (exact match) |
| Connection status | Generic element with text "Connected" or "Sending" |
| Language indicator | Paragraph with text "Language: [lang]" |

## Expected Output

Report the following in a summary table:

| Parameter | Value |
|-----------|-------|
| Location | {city}, {country} |
| Language | {native_name} ({code}) |
| Sports Center Name | {name} |
| Admin Name | {admin_name} |
| Email | {email} |
| Facilities | {count} |
| Sports | {list} |
| Feedback | {text} |
| **DB Verification** | |
| City in DB | {city_id} - {city_name} |
| Country ID | {country_id} ({country_name}) or NULL (FAILED) |

## Error Handling

- If "Connected" doesn't appear within 10 seconds, the API server may be down
- If message sending times out, check browser console for errors
- If sports center creation fails, the assistant will show an error message
- Take screenshots on failure using mcp__playwright__browser_take_screenshot
- If city has NULL country_id, the Google Places API lookup or LLM function call is not working correctly
- If database connection fails, ensure VPN is connected

## Notes

- Always wait for responses before sending next message (2-3 seconds minimum)
- The entire conversation should be in the selected local language
- Prices should be realistic for the local economy
- If star rating popup doesn't appear, always use the sidebar feedback form
