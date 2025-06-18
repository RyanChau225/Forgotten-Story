# final_review_gate.py
import sys
import os

if __name__ == "__main__":
    # Try to make stdout unbuffered for more responsive interaction.
    # This might not work on all platforms or if stdout is not a TTY,
    # but it's a good practice for this kind of interactive script.
    try:
        sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', buffering=1)
    except Exception:
        pass # Ignore if unbuffering fails, e.g., in certain environments

    try:
        sys.stderr = os.fdopen(sys.stderr.fileno(), 'w', buffering=1)
    except Exception:
        pass # Ignore

    print("--- MULTI-LINE REVIEW GATE ACTIVE ---", flush=True)
    print("Provide your sub-prompt. For multi-line input, type your text and then type 'END_INPUT' on a new line by itself to submit.", flush=True)
    print("Alternatively, type 'TASK_COMPLETE', 'Done', 'Quit', or 'q' on a new line to end the review process.", flush=True)
    
    user_input_lines = []
    user_input_received = False
    completion_signal_received = False

    print("REVIEW_GATE_AWAITING_INPUT:", end="", flush=True) # Initial prompt for the first line
    
    try:
        while True: # Loop to read multiple lines
            line = sys.stdin.readline()
            
            if not line:  # EOF - End of File, if the input stream closes
                print("--- REVIEW GATE: STDIN CLOSED (EOF), EXITING SCRIPT ---", flush=True)
                break 
            
            stripped_line = line.strip()

            if stripped_line.upper() == 'END_INPUT':
                if user_input_lines: # If some lines were actually entered before END_INPUT
                    user_input_received = True
                else: 
                    # If END_INPUT is typed without any preceding content, treat as empty.
                    print("--- REVIEW GATE: EMPTY INPUT (END_INPUT without content), EXITING SCRIPT (NO ACTION) ---", flush=True)
                break # Exit the while loop
            elif stripped_line.upper() in ['TASK_COMPLETE', 'DONE', 'QUIT', 'Q']:
                print(f"--- REVIEW GATE: USER SIGNALED OVERALL COMPLETION WITH '{stripped_line.upper()}' ---", flush=True)
                completion_signal_received = True
                break # Exit the while loop
            
            # For multi-line, we add the raw line (with its original newline if pasted) to preserve formatting if needed.
            # However, for consistency with single-line prompts, rstrip might be better.
            # Let's use rstrip to remove trailing newlines from each line before joining.
            user_input_lines.append(line.rstrip('\r\n')) 
            # The script waits for the next line; no explicit re-prompt needed here for multi-line.

        if user_input_received:
            full_input = "\n".join(user_input_lines) # Join all lines with a newline character
            print(f"USER_REVIEW_SUB_PROMPT: {full_input}", flush=True)
                
    except KeyboardInterrupt:
        print("--- REVIEW GATE: SESSION INTERRUPTED BY USER (KeyboardInterrupt) ---", flush=True)
    except Exception as e:
        print(f"--- REVIEW GATE SCRIPT ERROR: {e} ---", flush=True)
    
    if user_input_received:
        print("--- MULTI-LINE REVIEW GATE: SUB-PROMPT CAPTURED, SCRIPT EXITING. AI WILL PROCESS. ---", flush=True)
    elif completion_signal_received:
        print("--- MULTI-LINE REVIEW GATE: COMPLETION SIGNALED, SCRIPT EXITING. AI WILL CONCLUDE. ---", flush=True)
    else: # Covers EOF, empty END_INPUT without prior content, KeyboardInterrupt, or other errors
        print("--- MULTI-LINE REVIEW GATE: SCRIPT EXITING. ---", flush=True) 