import json
from flask import Flask
from flask import render_template, session
from flask import Response, request, jsonify, redirect, url_for
app = Flask(__name__)

# Set a secret key (still needed for other features)
app.secret_key = 'color_theory_quiz_secret_key'

# Use server memory storage instead of session
# This way when the server restarts, all data will be cleared
user_quiz_data = {
    "answers": {},
    "score": 0,
    "attempts": {},
    "hints_shown": {},
    "completed_questions": []
}

# ROUTES

@app.route('/')
def hello():
   return render_template('home.html')   

lesson_names = [
    "Monochromatic",
    "Complementary",
    "Analogous",
    "Triadic",
    "Tetradic"
]

lesson_number = 0

color_store = {}

with open('lessons.json') as f:
    lessons_data = json.load(f)

@app.route('/save_color', methods=['POST'])
def save_color():
    data = request.get_json()
    lesson_number = data.get('lesson_number')
    hsl = data.get('hsl')

    # Use some identifier — here we'll mock it as a fixed user_id
    user_id = "user1"
    
    if user_id not in color_store:
        color_store[user_id] = {}
    color_store[user_id][lesson_number] = hsl

    return jsonify(status='success')

@app.route('/learn/<int:lesson_number>')
def learn_lesson(lesson_number):
    # Handle invalid index
    if lesson_number < 0 or lesson_number >= len(lesson_names):
        lesson_number = 0

    lesson_info = lessons_data.get(str(lesson_number))
    
    # Fetch lesson name and description from the loaded data
    lesson_name = lesson_info['name']
    lesson_description = lesson_info['description']
    lesson_images = lesson_info['images']

    num_boxes_map = {
    0: 3,  # Monochromatic
    1: 2,  # Complementary
    2: 3,  # Analogous
    3: 3,  # Triadic
    4: 4   # Tetradic
    }

    num_boxes = num_boxes_map.get(lesson_number, 2)
    
    user_id = "user1"
    saved_color = color_store.get(user_id, {}).get(lesson_number)

    return render_template('learn.html', lesson_name=lesson_name, lesson_number=lesson_number, lesson_images=lesson_images, num_boxes=num_boxes, saved_color=saved_color, lesson_description = lesson_description, valid=True)


# Load questions from JSON file
def load_questions():
    with open("questions_full.json", "r") as f:
        return json.load(f)

@app.route('/quiz')
def quiz_start():
    # Reset global data (instead of session data)
    global user_quiz_data
    user_quiz_data = {
        "answers": {},
        "score": 0,
        "attempts": {},
        "hints_shown": {},
        "completed_questions": []
    }
    
    return render_template('quiz.html', qnum=0, question=None)

@app.route('/quiz/<int:qnum>')
def quiz_question(qnum):
    try:
        questions = load_questions()
        
        # Use global variable
        global user_quiz_data
        
        if 1 <= qnum <= len(questions):
            question = questions[qnum - 1]
            
            # Get user's previous answer and attempts for this question
            previous_answer = user_quiz_data['answers'].get(str(qnum))
            attempts = user_quiz_data['attempts'].get(str(qnum), 0)
            hint_shown = user_quiz_data['hints_shown'].get(str(qnum), False)
            is_completed = str(qnum) in user_quiz_data['completed_questions']
            
            return render_template(
                'quiz.html', 
                qnum=qnum, 
                question=question, 
                previous_answer=previous_answer,
                attempts=attempts,
                hint_shown=hint_shown,
                is_completed=is_completed,
                total_questions=len(questions),
                user_quiz_data=user_quiz_data  # Pass all data to the template
            )
        elif qnum > len(questions):
            # If we've reached the end of questions, go to result
            return render_template('quiz.html', 
                                  qnum=qnum, 
                                  question=None,
                                  total_questions=len(questions),
                                  user_quiz_data=user_quiz_data)
        else:
            return render_template('quiz.html', 
                                  qnum=0, 
                                  question=None,
                                  total_questions=len(questions),
                                  user_quiz_data=user_quiz_data)
    except Exception as e:
        # Log the error
        app.logger.error(f"Error in quiz route: {str(e)}")
        
        # Return to start page with error message
        return render_template('quiz.html', 
                              qnum=0, 
                              question=None, 
                              error=f"An error occurred: {str(e)}")

@app.route('/submit_answer', methods=["POST"])
def submit_answer():
    data = request.get_json()
    qnum = data.get("qnum")
    selected = data.get("answer")
    
    questions = load_questions()
    if qnum < 1 or qnum > len(questions):
        return jsonify({"error": "Invalid question number"}), 400
    
    qdata = questions[qnum - 1]
    qtype = qdata["type"]
    
    # Use global variable
    global user_quiz_data
    
    # If the question is already completed, don't allow new submissions
    if str(qnum) in user_quiz_data['completed_questions']:
        return jsonify({
            "error": "Question already answered",
            "previous_answer": user_quiz_data['answers'].get(str(qnum))
        }), 400
    
    # Get current attempts for this question
    current_attempts = user_quiz_data['attempts'].get(str(qnum), 0)
    # Increment attempts
    current_attempts += 1
    user_quiz_data['attempts'][str(qnum)] = current_attempts
    
    # Scoring logic
    is_correct = False
    
    # Special handling for drag questions (6 and 7)
    if qnum == 6 or qnum == 7:
        # For questions 6 and 7, the correct answer is always index 1
        # (or whatever is in correct_index + 1)
        correct_index = qdata.get("correct_index", 0) + 1
        is_correct = int(selected) == correct_index
    elif qtype == "mcq":
        is_correct = selected == qdata["correct"]
    elif qtype == "drag" and qnum == 8:
        # Question 8 accepts any answer
        is_correct = True
    
    # Update data
    user_quiz_data['answers'][str(qnum)] = selected
    
    if is_correct:
        # Award full point if first try, half point if after seeing hint
        if current_attempts == 1:
            user_quiz_data['score'] += 1
        else:
            # Award 0.5 points for correct answers after hint
            user_quiz_data['score'] += 0.5
        
        # Mark question as completed
        if str(qnum) not in user_quiz_data['completed_questions']:
            user_quiz_data['completed_questions'].append(str(qnum))
    else:
        # If first incorrect attempt, show hint
        if current_attempts == 1:
            user_quiz_data['hints_shown'][str(qnum)] = True
        
        # If second incorrect attempt, mark as completed
        if current_attempts >= 2:
            if str(qnum) not in user_quiz_data['completed_questions']:
                user_quiz_data['completed_questions'].append(str(qnum))
    
    return jsonify({
        "correct": is_correct,
        "attempts": current_attempts,
        "score": user_quiz_data['score'],
        "hint_shown": user_quiz_data['hints_shown'].get(str(qnum), False),
        "is_completed": str(qnum) in user_quiz_data['completed_questions']
    })

@app.route('/reset_quiz', methods=["POST"])
def reset_quiz():
    # Reset global data
    global user_quiz_data
    user_quiz_data = {
        "answers": {},
        "score": 0,
        "attempts": {},
        "hints_shown": {},
        "completed_questions": []
    }
    return redirect(url_for('quiz_start'))

@app.route('/result')
def quiz_result():
    try:
        # Use global variable
        global user_quiz_data
        questions = load_questions()
        
        # Get score
        score = user_quiz_data.get("score", 0)
        
        return render_template(
            "result.html", 
            score=score, 
            total=len(questions), 
            answers=user_quiz_data.get("answers", {}),
            questions=questions,
            user_quiz_data=user_quiz_data
        )
    except Exception as e:
        # Log the error
        app.logger.error(f"Error rendering result page: {str(e)}")
        
        # Return a simple error page
        return """
        <html>
        <head>
            <title>Quiz Result Error</title>
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/css/bootstrap.min.css">
        </head>
        <body class="bg-light">
            <div class="container text-center mt-5">
                <div class="alert alert-danger">
                    <h3>There was an error displaying your quiz results</h3>
                    <p>Please try again or return to the home page.</p>
                </div>
                <div class="mt-4">
                    <a href="/" class="btn btn-primary">Return to Home</a>
                    <a href="/quiz" class="btn btn-secondary ml-2">Restart Quiz</a>
                </div>
            </div>
        </body>
        </html>
        """

if __name__ == '__main__':
   app.run(debug = True, port=5001)
