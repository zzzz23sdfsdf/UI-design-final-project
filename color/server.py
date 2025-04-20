from flask import Flask
from flask import render_template
from flask import Response, request, jsonify
app = Flask(__name__)


current_id = 2
data = [
    {
        "id": 1,
        "name": "michael scott"
    },
    {
        "id": 2,
        "name": "jim halpert"
    },
]

# ROUTES

@app.route('/')
def hello():
   return render_template('home.html')   


@app.route('/learn')
def hello_world():
   return render_template('learn.html')   


@app.route('/quiz')
def hello_name():
    return render_template('quiz.html') 


@app.route('/quiz_result')
def people():
    return render_template('quiz_result.html')  


# AJAX FUNCTIONS

# ajax for people.js
@app.route('/add_name', methods=['GET', 'POST'])
def add_name():
    global data 
    global current_id 

    json_data = request.get_json()   
    name = json_data["name"] 
    
    # add new entry to array with 
    # a new id and the name the user sent in JSON
    current_id += 1
    new_id = current_id 
    new_name_entry = {
        "name": name,
        "id":  current_id
    }
    data.append(new_name_entry)

    #send back the WHOLE array of data, so the client can redisplay it
    return jsonify(data = data)


if __name__ == '__main__':
   app.run(debug = True, port=5001)




