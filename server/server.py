import json
import logging
from math import ceil, floor
import random
import pandas as pd
import time
import threading

from db import MongoDB
from dspy_accessor import DSPyAccessor, DSPyModule
from flask import Flask, jsonify, request
from flask_cors import cross_origin
from flask_login import LoginManager, current_user, login_required, login_user
from passwords import mongodb_uri, flask_secret_key, redis_broker_url
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from werkzeug.exceptions import InternalServerError, NotFound
from celery import Celery, Task, shared_task
from celery.result import AsyncResult

TEMPERATURE = 0.7
WRITE_TO_DB = True
CHECK_PROMPT_THRESHOLD = 5

app = Flask(__name__)

# Configure Flask logging
app.logger.setLevel(logging.INFO)  # Set log level to INFO
handler = logging.FileHandler('app.log')  # Log to a file
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
app.logger.addHandler(handler)

# Configure login manager
app.config['SECRET_KEY'] = flask_secret_key
login_manager = LoginManager()
login_manager.init_app(app)

client = MongoClient(mongodb_uri, server_api=ServerApi('1'))

# Send a ping to confirm a successful connection
try:
    client.admin.command('ping')
    app.logger.info(
        "Pinged your deployment. You successfully connected to MongoDB!")
except Exception as db_error:
    app.logger.error(db_error)

db = MongoDB(client)

dspya = DSPyAccessor(app)

################################### CELERY CODE ###################################

def celery_init_app(app: Flask) -> Celery:
    class FlaskTask(Task):
        def __call__(self, *args: object, **kwargs: object) -> object:
            with app.app_context():
                return self.run(*args, **kwargs)

    # celery_app = Celery(app.name, task_cls=FlaskTask)
    celery_app = Celery(app.name)
    celery_app.config_from_object(app.config["CELERY"])
    celery_app.Task = FlaskTask
    celery_app.set_default()
    app.extensions["celery"] = celery_app
    return celery_app

# Celery configuration
app.config.from_mapping(
    CELERY=dict(
        broker_url=redis_broker_url,
        result_backend=redis_broker_url,
        task_ignore_result=True,
    ),
)
# Initialize Celery
celery = celery_init_app(app)

################################### LOGIN MANAGER CODE ###################################

# create a user class


class User:
    def __init__(self, user_id):
        self.user_id = user_id

    def is_authenticated(self):
        return True

    def is_active(self):
        return True

    def is_anonymous(self):
        return False

    def get_id(self):
        return self.user_id


@login_manager.user_loader
def load_user(user_id):
    return User(user_id)

################################### API ENDPOINTS ###################################

################################### TEST ENDPOINTS ###################################

@shared_task(ignore_result=False)
def add_together(a, b):
    # add a 3 second delay
    time.sleep(3)
    return a + b

@app.route('/api/start_add', methods=["POST"])
@cross_origin()
def start_add():
    """
    Front-end sends a and b
    Back-end returns a + b
    """
    try:
        a = request.json["a"]
        b = request.json["b"]

        app.logger.info("Testing celery with %s and %s", a, b)

        result = add_together.delay(a, b)
        return jsonify({'result': result.id})
    except Exception as e:
        app.logger.error("Error when testing celery")
        app.logger.error(e)
        raise InternalServerError() from e

# NOTE: we are adding a timestamp param to avoid cloudfront's caching    
@app.route('/api/get_result/<id>/<timestamp>', methods=["GET"])
@cross_origin()
def get_result(id, timestamp):
    """
    Front-end sends task id
    Back-end returns result
    """
    try:
        app.logger.info("Getting result for task %s with time %s", id, timestamp)
        result = AsyncResult(id)
        app.logger.info("Result: %s", result.result)
        return jsonify({
            "ready": result.ready(),
            "successful": result.successful(),
            "value": result.result if result.ready() else None,
        })
    except Exception as e:
        app.logger.error("Error when getting result for task %s", id)
        app.logger.error(e)
        raise InternalServerError() from e

################################### HOMEPAGE ENDPOINTS ###################################

# NOTE: not needed for now
# @app.route('/api/create_account', methods=["POST"])
# @cross_origin()
# def create_account():
#     """
#     Front-end sends nothing
#     Add a new entry to the user collection via db.add_user()
#     Back-end returns user_id

#     NOTE: Right now, use temporary user codes (i.e. user_id)
#     """
#     return jsonify({'status': 'ok'})


@app.route('/api/log_in', methods=["POST"])
@cross_origin()
def log_in():
    """
    Front-end sends user_id
    Check if user_id is in the user collection via db.verify_user()
    Back-end returns list of project ids and titles (projects) if user_id is valid
    """
    # get the user_code from the request
    user_id = request.json["user_code"]
    app.logger.info("User code is %s", user_id)

    # check to see if the user_id exists in the users collection
    if db.verify_user(user_id):
        app.logger.info("User found")
        # log in the user
        login_user(User(user_id))
        app.logger.info("User %s logged in", current_user.get_id())
        # get the projects for the user
        projects = db.get_user_projects(user_id)
        return jsonify({'projects': projects})
    else:
        app.logger.error("User not found")
        raise NotFound()


@app.route('/api/delete_project', methods=["POST"])
@login_required
@cross_origin()
def delete_project():
    """
    Front-end sends project_id
    Delete the project entry from the projects collection 
        via db.delete_project(project_id)
    Update the projects field in the users collection 
        via db.delete_user_project(user_id, project_id)
    Back-end returns {ok}
    """
    try:
        # get the project_id from the request
        project_id = request.json["project_id"]
        # get the user_id from the current user
        user_id = current_user.get_id()

        # delete the project from the user's list of projects
        db.delete_user_project(user_id, project_id)

        # NOTE: for now, I won't delete the data since I might want to keep it for analysis

        # # delete the project from the projects collection
        # db.delete_project(project_id)

        # # delete all the cells for the project
        # db.delete_cells(project_id)

        app.logger.info("Project %s deleted", project_id)

        return jsonify({'status': 'ok'})
    
    except Exception as e:
        app.logger.error("Error when deleting project %s", project_id)
        app.logger.error(e)
        raise InternalServerError() from e

# NOTE: not needed for now
# @app.route('/api/duplicate_project', methods=["POST"])
# @login_required
# @cross_origin()
# def duplicate_project():
#     """
#     Front-end sends project_id
#     Duplicate the project entry in the projects collection via 
#         db.duplicate_project(project_id)
#     Update the projects field in the users collection via 
#         db.add_user_project(user_id, new_project_id, new_project_title)
#     Back-end returns new project_id

#     NOTE: Could run get_projects again to update the list of projects in the front-end
#           or just keep track of the list of projects in the front-end
#     """
#     return jsonify({'status': 'ok'})


@app.route('/api/load_project', methods=["POST"])
@login_required
@cross_origin()
def load_project():
    """
    Front-end sends project_id
    Run db.get_project(project_id)
    Run db.get_cell(project_id) for each cell in the project
        Back-end returns project and cell info
    """
    # get the project_id from the request
    project_id = request.json["project_id"]

    try:
        # get the project
        project = db.get_project(project_id)

        if project is None:
            app.logger.error("Project %s not found", project_id)
            raise NotFound()
        else:
            app.logger.info("Project %s found", project_id)

    except Exception as e1:
        app.logger.error("Project %s not found", project_id)
        app.logger.error(e1)
        raise NotFound() from e1

    # get the cells for the project
    try:
        cells = db.get_cells(project_id)

        if cells is not None:
            # convert cells into a dictionary that maps cell_id to the rest of the cell info
            cells_dict = {}
            for cell in cells:
                # get object id as string
                # cell_id = str(cell['_id'])
                cell_id = str(cell['cell_id'])
                # remove the object id from the cell
                # Object of type ObjectId is not JSON serializable
                cell.pop('_id', None)
                cells_dict[cell_id] = cell
        else:
            cells_dict = {}

        # remove the object id from the project
        # Object of type ObjectId is not JSON serializable
        project.pop('_id', None)

        app.logger.info("Cells for project %s found", project_id)

        # return the project and cells
        return jsonify({'project': project, 'cells': cells_dict})

    except Exception as e2:
        app.logger.error("Error when loading cells")
        app.logger.error(e2)
        raise InternalServerError() from e2


@app.route('/api/create_project', methods=["POST"])
@login_required
@cross_origin()
def create_project():
    """
    Front-end sends user_id 
    Add a new entry to the projects collection 
    Update the projects field in the users collection 
    Get the context questions
    Back-end returns project_id, project_title, and context questions
    """
    try:
        # get the user_id from the current user
        user_id = current_user.get_id()

        app.logger.info("User %s creating a new project", user_id)

        # temp project name
        project_title = "New Project"

        if WRITE_TO_DB:
            # add a new project to the projects collection
            project_id = db.add_project(user_id, title=project_title)

            # add the project to the user's list of projects
            db.add_user_project(user_id, project_id, project_title)
        else:
            project_id = 0

        # NOTE: load step1_questions_ccc.json if want to have pre-populated responses
        with open("data/step1_questions.json", "r") as f:
            data = json.load(f)

        # with open("data/step1_questions.json", "r") as f:
        #     data = json.load(f)

        if WRITE_TO_DB:
            # set the context_response field in the projects collection
            db.edit_project_fields(
                project_id, {"context_response": data["questions"]})

            app.logger.info("Project %s created", project_id)

        # return the project_id and title and context questions
        return jsonify({
            'project_id': project_id,
            'project_title': project_title,
            'questions': data["questions"]
        })

    except Exception as e:
        app.logger.error("Error when creating project")
        app.logger.error(e)
        raise InternalServerError() from e

################################### STEP 1 ENDPOINTS ###################################
# Endpoints for step 1 of system diagram (users providing initial context)
# NOTE: for now, I'm ignoring the upload file / share URL feature


@app.route('/api/check_question_response', methods=["POST"])
@login_required
@cross_origin()
def check_question_response():
    """
    Front-end sends project_id, context_question_id, response_text, ignored_warnings
    Send inputs to the right DSPy module and get the response
    Save the inputs and outputs in the prompts collection via db.add_prompt()
    Back-end returns list of warnings
    """
    try:
        # get the info from the request
        project_id = request.json["project_id"]
        context_question_id = request.json["context_question_id"]
        response_text = request.json["response_text"]
        ignored_warnings = request.json["ignored_warnings"]

        # convert response in last question to a longer string
        if context_question_id == 8:
            response_text = f"{
                response_text} percent of questions are open-ended and the remaining are close-ended"

        # app.logger.info(response_text)

        # # TEMP: randomly generate warnings
        # warnings = []
        # for i in range(random.randint(0, 5)):
        #     warnings.append(f"This is warning message number {i+1}.")

        # get the advice for the context_question_id from "step1_questions_advice.json"
        with open("data/step1_questions_advice.json", "r") as f:
            data = json.load(f)
            advice = data["questions"][str(context_question_id)]["advice"]
            context_question = data["questions"][str(context_question_id)]["question"]

        warnings = []

        # if the advice is not empty, call DSPy CHECK_PROMPT Module
        if len(advice) > 0:
            # format advice and ignored_warnings
            advice = dspya.format_list_to_string(advice)
            ignored_warnings = dspya.format_list_to_string(
                ignored_warnings)

            # app.logger.info("Inputs to CHECK_PROMPT: %s, %s, %s, %s",
            #                 context_question, response_text, advice, ignored_warnings)

            # connect with LLMs
            # invoke the module and get the output
            output = dspya.invoke_module(**{"module_name": DSPyModule.CHECK_PROMPT,
                                            "context_question": context_question,
                                            "user_response": response_text,
                                            "advice": advice,
                                            "ignored_suggestions": ignored_warnings,
                                            "temp": TEMPERATURE})
            
            # app.logger.info("Outputs from CHECK_PROMPT: %s", output)

            # save the prompts and responses in the prompts collection via db.add_prompt()
            if WRITE_TO_DB:
                db.add_prompt(project_id,
                              DSPyModule.CHECK_PROMPT.value,
                              {"context_question": context_question,
                               "user_response": response_text,
                               "advice": advice,
                               "ignored_suggestions": ignored_warnings},
                              output)

            # format output if inform_score is below threshold
            if (int(output["inform_score"]) <= CHECK_PROMPT_THRESHOLD):
                warnings = dspya.format_string_to_list(output["suggestions"], "suggestions")

        app.logger.info("Checked response for question %s in project %s",
                        context_question_id, project_id)

        # return the warnings
        return jsonify({'warnings': warnings})

    except Exception as e:
        app.logger.error(
            "Error when checking response for question %s in project %s",
            context_question_id, project_id)
        app.logger.error(e)
        raise InternalServerError() from e


@app.route('/api/update_context', methods=["POST"])
@login_required
@cross_origin()
def update_context():
    """
    Front-end sends project_id, context
    Save the context to the projects collection via db.edit_project_fields()
    Back-end returns {ok}
    """
    try:
        # get the info from the request
        project_id = request.json["project_id"]
        context = request.json["context"]

        # get user_id from current user
        user_id = current_user.get_id()

        app.logger.info("Saving context for user %s project %s: %s", user_id, project_id, context)

        if WRITE_TO_DB:
            # save context to DB
            db.edit_project_fields(project_id, {"context_response": context})

            app.logger.info("Updated context for project %s", project_id)

        return jsonify({'status': 'ok'})

    except Exception as e:
        app.logger.error(
            "Error when updating context for project %s", project_id)
        app.logger.error(e)
        raise InternalServerError() from e

@shared_task(ignore_result=False)
def generate_draft(project_id):
    """
    Generate draft for a project
    """
    # get the context from the project in the projects collection
    context = db.get_field_in_project(project_id, "context_response")

    # convert context to one string
    formatted_context = dspya.format_context(context)

    # invoke the module and get the output
    # get the draft_type from context
    draft_type = context["4"]["response"].lower()
    # if the draft_type has multiple words, combine with underscore
    draft_type = "_".join(draft_type.split())

    output = dspya.invoke_module_json_output(**{"output_name": "sections",
                                                    "module_name": DSPyModule.CREATE_DRAFT,
                                                    "is_gpt4": True,
                                                    "context": formatted_context,
                                                    "draft_type": draft_type,
                                                    "temp": TEMPERATURE})
    
    app.logger.info("Generated draft for project %s", project_id)
    
    # save the prompts and responses in the prompts collection via db.add_prompt()
    # save the prompts and responses in the prompts collection via db.add_prompt()
    if WRITE_TO_DB:
        db.add_prompt(project_id,
                        DSPyModule.CREATE_DRAFT.value,
                        {"context": context, "draft_type": draft_type},
                        output)

    # format output
    data = dspya.format_project(output, draft_type)

    # call DETECT_TOPICS module
    output = dspya.invoke_module(**{"module_name": DSPyModule.DETECT_TOPICS,
                                "is_gpt4": True,        
                                "context": formatted_context,
                                "return_rationale": False,
                                "temp": TEMPERATURE})
    
    app.logger.info("Generated the following topics for project %s: %s", project_id, output["topics"])
    
    # save the prompts and responses in the prompts collection via db.add_prompt()
    if WRITE_TO_DB:
        db.add_prompt(project_id,
                        DSPyModule.DETECT_TOPICS.value,
                        {"context": context},
                        output)

    # format topics into a list
    topics = dspya.format_string_to_list(output["topics"], "topics")

    # process the topics into the analyze_topics_info structure
    analyze_topics_info_topics = {}
    for topic in topics:
        analyze_topics_info_topics[topic] = {
            "cells": [],
            "suggestion_rationale": ""
        }
    # add the "Unclassified" topic
    analyze_topics_info_topics["Unclassified"] = {
        "cells": [],
        "suggestion_rationale": ""
    }

    # wrap in the correct analyze_topics_info structure
    analyze_topics_info = {
        "topics": analyze_topics_info_topics,
        "summary": "",
        "last_analyzed": "",
        "suggestions": {}
    }

    # save analyze_topics_info in the projects collection
    if WRITE_TO_DB:
        db.edit_project_fields(project_id, {"analyze_topics_info": analyze_topics_info})

        app.logger.info("Saved topics to project %s", project_id)

    return {"project_details": data, "topics": topics}

@app.route('/api/submit_context', methods=["POST"])
@login_required
@cross_origin()
def submit_context():
    """
    Front-end sends project_id and context
    Send inputs to the right DSPy modules and get the response
    Save the inputs and outputs in the prompts collection via db.add_prompt()
    Back-end returns AI-generated draft (projects and cells) and list of topics
    """
    try:
        # start_time = time.time()
        # get the info from the request
        project_id = request.json["project_id"]
        context = request.json["context"]

        # convert response in last question to a longer string
        context["6"]["response"] = f"{
            context["6"]["response"]} percent of questions are open-ended and the remaining are close-ended"
        # app.logger.info(context["6"]["response"])

        if WRITE_TO_DB:
            # save context to DB
            db.edit_project_fields(project_id, {"context_response": context})
            app.logger.info("Submitted context for project %s", project_id)

        # Generate draft for a project
        result = generate_draft.delay(project_id)

        return jsonify({'task_id': result.id})

    except Exception as e:
        app.logger.error(
            "Error when submitting context for project %s", project_id)
        app.logger.error(e)
        raise InternalServerError() from e

################################### BUILDER ENDPOINTS ###################################
# Endpoints for basic survey builder operations


@app.route('/api/update_all_questions', methods=["POST"])
@login_required
@cross_origin()
def update_all_questions():
    """
    Front-end sends project_id, sections, cells
    Update the project title and sections fields in the projects collection via db.edit_project_fields()
    Also update the cells collection (either edit cells or delete cells or add new cells)
    For new or edited questions, run the question type classifications
    NOTE: no need to run the topic classification
    Back-end return {ok}

    NOTE: I decided not to update the suggestion statuses 
          (event_tracking will capture moments when the user accepts or rejects a suggestion)
          (only the latest suggestions will be stored in projects and cells)
    NOTE: this function is run every 30 seconds
    """
    try:
        # get the info from the request
        project_id = request.json["project_id"]
        project_title = request.json["project_title"]
        sections = request.json["sections"]
        cells = request.json["cells"]
        deleted_cells = request.json["deleted_cells"]
        edited_cells = request.json["edited_cells"]
        added_cells = request.json["added_cells"]

        app.logger.info("Cell ids: %s", list(cells.keys()))
        app.logger.info("Added cells: %s", added_cells)
        app.logger.info("Edited cells: %s", edited_cells)
        app.logger.info("Deleted cells: %s", deleted_cells)
        app.logger.info("Project title: %s", project_title)
        # app.logger.info("Cells: %s", cells)

        app.logger.info("Saving project details for %s", project_id)

        if WRITE_TO_DB:
            # update the project title and sections
            db.edit_project_fields(
                project_id, {"project_title": project_title, "sections": sections})

            app.logger.info("Project fields for %s updated", project_id)

            # update the list of projects in user collection
            user_id = current_user.get_id()
            db.edit_project_title(user_id, project_id, project_title)

            app.logger.info("Project title for %s updated", project_id)

            # iterate through added cells and add them
            for cell_id in added_cells:
                db.add_cell(project_id, cell_id,
                            cells[cell_id]["cell_details"],
                            cells[cell_id]["section_index"],
                            last_updated=cells[cell_id]["last_updated"],
                            human_ai_status=cells[cell_id]["human_ai_status"],
                            time_estimate=cells[cell_id]["time_estimate"])
                
                app.logger.info("Cell %s added", cell_id)

            app.logger.info("Cells for %s added", project_id)

            # iterate through edited cells and update them
            for cell_id in edited_cells:
                db.edit_cell_fields(cell_id, {
                    "section_index": cells[cell_id]["section_index"],
                    "cell_details": cells[cell_id]["cell_details"],
                    "last_updated": cells[cell_id]["last_updated"],
                    "human_ai_status": cells[cell_id]["human_ai_status"],
                    "time_estimate": cells[cell_id]["time_estimate"]
                })

                app.logger.info("Cell %s edited", cell_id)

            app.logger.info("Cells for %s edited", project_id)

            # update the cells
            # iterate through deleted cells and delete them
            for cell_id in deleted_cells:
                db.delete_cell(cell_id)

                app.logger.info("Cell %s deleted", cell_id)

            app.logger.info("Cells for %s deleted", project_id)

            app.logger.info("Project %s updated", project_id)

        return jsonify({'status': 'ok'})

    except Exception as e:
        app.logger.error("Error when saving project %s", project_id)
        app.logger.error(e)
        raise InternalServerError() from e


@app.route('/api/switch_response_format', methods=["POST"])
@login_required
@cross_origin()
def switch_response_format():
    """
    Front-end sends project_id and cell_id and cell_details
    Send inputs to the right DSPy module and get the response
    Save the inputs and outputs in the prompts collection via db.add_prompt()
    Back-end returns new_cell_details

    NOTE: Won't update cell_details field in the cells collection. 
          It will be updated in the next update_all_questions
    NOTE: currently there isn't a way to check if the same inputs are being sent to DSPy.
          It might not be a problem since DSPy caches the prompts.
          We could potentially fix this in the front-end but not sure if it's necessary
    """

    try:
        # get the info from the request
        project_id = request.json["project_id"]
        cell_id = request.json["cell_id"]
        cell_details = request.json["cell_details"]

        # connect with LLMs
        # convert cell_details to a string
        cell_details_str = json.dumps(cell_details)

        # get the format from MongoDB
        # get the context from the project in the projects collection
        context = db.get_field_in_project(project_id, "context_response")
        # get the draft_type from context
        draft_type = context["4"]["response"].lower()
        draft_type = "_".join(draft_type.split())

        # invoke the module and get the output
        output = dspya.invoke_module_json_output(**{"output_name": "new_question",
                                                    "module_name": DSPyModule.SWITCH_RESPONSE_FORMAT,
                                                    "question": cell_details_str,
                                                    "return_rationale": False,
                                                    "temp": TEMPERATURE})

        # app.logger.info(f"Rationale is {output["rationale"]}")

        # save the prompts and responses in the prompts collection via db.add_prompt()
        if WRITE_TO_DB:
            db.add_prompt(project_id,
                          DSPyModule.SWITCH_RESPONSE_FORMAT.value,
                          {"question": cell_details_str},
                          output)

        # convert to json
        new_question = json.loads(output["new_question"])

        # assert that the response format has flipped
        if cell_details["response_format"] == "open":
            assert new_question["response_format"] == "closed"
        else:
            assert new_question["response_format"] == "open"

        # add in time estimate
        formatted_question = dspya.format_cells([new_question], ["time_estimate"], draft_type)

        app.logger.info("Switched response format for cell %s", cell_id)

        # return the new_question
        return jsonify({'content': formatted_question[0]})

    except Exception as e:
        app.logger.error(
            "Error when switching response format for cell %s", cell_id)
        app.logger.error(e)
        raise InternalServerError() from e


################################### GENERATE OPTIONS ENDPOINTS ###################################
# Endpoints for generate multiple options

@app.route('/api/reword_question', methods=["POST"])
@login_required
@cross_origin()
def reword_question():
    """
    Front-end sends project_id and cell_id and cell_details
    Send inputs to the right DSPy module and get the response
    Save the inputs and outputs in the prompts collection via db.add_prompt()
        Back-end returns three alternative wordings
    """
    try:
        # get the info from the request
        project_id = request.json["project_id"]
        cell_id = request.json["cell_id"]
        cell_details = request.json["cell_details"]
        existing_questions = request.json["existing_questions"] # an object mapping cell_ids to cell_details for a section

        # connect with LLMs
        # convert cell_details to a string
        cell_details_str = json.dumps(cell_details)

        # convert existing_questions to a string
        existing_questions_str = json.dumps([existing_questions[cell_id] for cell_id in existing_questions])
        # app.logger.info(existing_questions_str)

        # get the format from MongoDB
        # get the context from the project in the projects collection
        context = db.get_field_in_project(project_id, "context_response")
        # get the draft_type from context
        draft_type = context["4"]["response"].lower()
        draft_type = "_".join(draft_type.split())

        # format context into one string
        formatted_context = dspya.format_context(context)

        # OPTIONAL: always re-generate the rewordings by randomizing the temperature
        # rand_int = random.randint(1, 100)
        # invoke the module and get the output
        output = dspya.invoke_module_json_output(**{"output_name": "rewordings",
                                                    "module_name": DSPyModule.REWORD_QUESTION,
                                                    "is_gpt4": False,
                                                    "context": formatted_context,
                                                    "existing_questions": existing_questions_str,
                                                    "question": cell_details_str,
                                                    "return_rationale": False,
                                                    "temp": TEMPERATURE,
                                                    # "temp": TEMPERATURE+0.0001*rand_int
                                                    })

        # save the prompts and responses in the prompts collection via db.add_prompt()
        if WRITE_TO_DB:
            db.add_prompt(project_id,
                          DSPyModule.REWORD_QUESTION.value,
                          {
                              "context": formatted_context,
                              "existing_questions": existing_questions_str,
                              "question": cell_details_str,
                            },
                          output)

        # convert to json
        rewordings = json.loads(output["rewordings"])

        # format the cells
        rewordings = dspya.format_cells(rewordings, ["time_estimate"], draft_type)

        app.logger.info("Reworded question %s", cell_id)

        # return the rewordings
        return jsonify({'content': rewordings})

    except Exception as e:
        app.logger.error("Error when rewording question %s", cell_id)
        app.logger.error(e)
        raise InternalServerError() from e


@app.route('/api/generate_specific_rewording', methods=["POST"])
@login_required
@cross_origin()
def generate_specific_rewording():
    """
    Front-end sends project_id and cell_id and cell_details and specific_request
    Send inputs to the right DSPy module and get the response
    Save the inputs and outputs in the prompts collection via db.add_prompt()
        Back-end returns three possible questions (only one is displayed at a time to the user)
    """
    try:
        # get the info from the request
        project_id = request.json["project_id"]
        cell_id = request.json["cell_id"]
        cell_details = request.json["cell_details"]
        specific_request = request.json["specific_request"]
        existing_questions = request.json["existing_questions"] # an object mapping cell_ids to cell_details for a section

        # connect with LLMs
        # convert cell_details to a string
        cell_details_str = json.dumps(cell_details)

        # convert existing_questions to a string
        existing_questions_str = json.dumps([existing_questions[cell_id] for cell_id in existing_questions])
        # app.logger.info(existing_questions_str)

        # get the format from MongoDB
        # get the context from the project in the projects collection
        context = db.get_field_in_project(project_id, "context_response")
        # get the draft_type from context
        draft_type = context["4"]["response"].lower()
        draft_type = "_".join(draft_type.split())

        # format context into one string
        formatted_context = dspya.format_context(context)

        # always re-generate the rewordings by randomizing the temperature
        rand_int = random.randint(1, 100)
        # invoke the module and get the output
        output = dspya.invoke_module_json_output(**{"output_name": "rewordings",
                                                    "module_name": DSPyModule.REWORD_QUESTION_FROM_REQUEST,
                                                    "is_gpt4": False,
                                                    "context": formatted_context,
                                                    "existing_questions": existing_questions_str,
                                                    "question": cell_details_str,
                                                    "request": specific_request,
                                                    "return_rationale": False,
                                                    "temp": TEMPERATURE+0.0001*rand_int})

        # app.logger.info(f"Rationale is {output["rationale"]}")

        # save the prompts and responses in the prompts collection via db.add_prompt()
        if WRITE_TO_DB:
            db.add_prompt(project_id,
                          DSPyModule.REWORD_QUESTION_FROM_REQUEST.value,
                          {
                              "context": formatted_context,
                              "existing_questions": existing_questions_str,
                              "question": cell_details_str,
                              "request": specific_request
                            },
                          output)

        # convert to json
        rewordings = json.loads(output["rewordings"])

        # format the cells
        rewordings = dspya.format_cells(rewordings, ["time_estimate"], draft_type)

        app.logger.info("Reworded question %s from request", cell_id)

        # return the rewordings
        return jsonify({'content': rewordings})

    except Exception as e:
        app.logger.error(
            "Error when rewording question %s from request", cell_id)
        app.logger.error(e)
        raise InternalServerError() from e

################################### CHECK QUESTION ENDPOINTS ###################################
# Endpoints for check question


@app.route('/api/check_question', methods=["POST"])
@login_required
@cross_origin()
def check_question():
    """
    Front-end sends project_id and cell_id and cell_details
    Get cell_details from the cells collection via db.get_field_in_cell()
    If the cell_details are different from the last time, 
        Prepare relevant LLM prompts and run the LLM model and get the response
        Save the prompts and responses in the prompts collection via db.add_prompt()
        Replace the cell_details, last_checked and checks fields in the cells collection via db.edit_cell_fields()
    If the cell_details are the same, 
        Get checks field in the cells collection via db.get_field_in_cell()
        Replace the last_checked field in the cells collection via db.edit_cell_fields()
        Back-end returns checks
    """
    try:
        # get the info from the request
        project_id = request.json["project_id"]
        cell_id = request.json["cell_id"]
        cell_details = request.json["cell_details"]
        checks_to_ignore = request.json["checks_to_ignore"]

        # app.logger.info("Checks to ignore %s: %s", type(checks_to_ignore), checks_to_ignore)

        # connect with LLMs
        # convert cell_details to a string
        cell_details_str = json.dumps(cell_details)

        # get the format from MongoDB
        # get the context from the project in the projects collection
        context = db.get_field_in_project(project_id, "context_response")
        # get the draft_type from context
        draft_type = context["4"]["response"].lower()
        draft_type = "_".join(draft_type.split())

        # format context into one string
        formatted_context = dspya.format_context(context)

        # NOTE: assume reading level is third grade for everything
        # rand_int = random.randint(1, 100)
        # invoke the module and get the output
        output = dspya.invoke_module_json_output(**{"output_name": "rewritten_questions",
                                                    "module_name": DSPyModule.CHECK_QUESTION,
                                                    "checks_to_ignore": checks_to_ignore,
                                                    "context": formatted_context,
                                                    "question": cell_details,
                                                    "reading_level": "third grade",
                                                    "temp": TEMPERATURE,
                                                    # "temp": TEMPERATURE+0.0001*rand_int
                                                    })

        # app.logger.info(output["cleaned_scores"])

        # save the prompts and responses in the prompts collection via db.add_prompt()
        if WRITE_TO_DB:
            db.add_prompt(project_id,
                          DSPyModule.CHECK_QUESTION.value,
                          {
                              "checks_to_ignore": checks_to_ignore,
                              "context": formatted_context,
                              "question": cell_details_str,
                              "reading_level": "third grade"},
                          output)

        # convert to json
        rewritten_questions = json.loads(output["rewritten_questions"])
        # app.logger.info("Rewritten questions: %s", rewritten_questions)

        if len(rewritten_questions) == 1 and rewritten_questions[0] == "empty":
            app.logger.info("Checked question %s", cell_id)
            return jsonify({'check_suggestions': [], 'cell_checks': []})

        # run the re-written questions through the assess modules
        initial_flags = [x["check_type"] for x in output['cleaned_scores']]
        # app.logger.info("Initial flags: %s", initial_flags)

        # run ASSESS_QUESTIONS on output_questions
        scores = dspya.invoke_module(**{"module_name": DSPyModule.ASSESS_QUESTIONS,
                                    "questions": rewritten_questions,
                                    "initial_flags": initial_flags,
                                    "reading_level": "third grade",
                                    "temp": TEMPERATURE})
        # app.logger.info("Scores: %s", scores)
        
        # save the prompts and responses in the prompts collection via db.add_prompt()
        if WRITE_TO_DB:
            db.add_prompt(project_id,
                          DSPyModule.ASSESS_QUESTIONS.value,
                          {
                              "questions": rewritten_questions,
                              "initial_flags": initial_flags,
                              "reading_level": "third grade"},
                          scores)
            
        # format the cells
        rewritten_questions = dspya.format_cells(rewritten_questions, ["time_estimate"], draft_type)
        # app.logger.info("Rewritten questions: %s", rewritten_questions)

        cleaned_rewritten_questions = []

        # merge the scores with the rewritten questions
        for i, question in enumerate(rewritten_questions):
            # if the scores have nothing in the "fixed" field than don't add to list
            if len(scores["scores"][i]["fixed"]) == 0:
                continue

            question["fixed_checks"] = scores["scores"][i]["fixed"]
            question["flagged_checks"] = scores["scores"][i]["flagged"]
            question["num_fixed"] = len(scores["scores"][i]["fixed"])

            # add question to cleaned_rewritten_questions
            cleaned_rewritten_questions.append(question)

        # NOTE: commented out because the front-end orders questions by length
        # # order cleaned_rewritten_questions from highest num_fixed to lowest
        # cleaned_rewritten_questions = sorted(cleaned_rewritten_questions, key=lambda x: x["num_fixed"], reverse=True)
        # # app.logger.info(cleaned_rewritten_questions)

        app.logger.info("Checked question %s", cell_id)

        # return the rewordings
        return jsonify({'check_suggestions': cleaned_rewritten_questions, 'cell_checks': output["cleaned_scores"]})

    except Exception as e:
        app.logger.error("Error when checking question %s", cell_id)
        app.logger.error(e)
        raise InternalServerError() from e


@app.route('/api/check_all_questions', methods=["POST"])
@login_required
@cross_origin()
def check_all_questions():
    """
    Front-end sends project_id
    Get the sections field in the projects collection via db.get_field_in_project()
    For each question in sections, do something similar to check_question()
        Back-end returns dictionary of cell_id to checks 

    NOTE: first run update_all_questions and then run this
    """
    return jsonify({'status': 'ok'})

################################### ANALYZE TOPICS ENDPOINTS ###################################
# Endpoints for analyze topics

def get_over_and_under_topics(topics):
    """
    Get the topics that are over and under-represented
    If the proportion is <=0 and < 1/N --> topic is underrepresented
    If the proportion is > min(2/N, 0.5) --> topic is overrepresented
    """
    # remove "Unclassified" from topics if it exists
    if "Unclassified" in topics:
        topics.pop("Unclassified")

    # get the total number of topics
    n_topics = len(topics)

    # get the count of cells for each topic
    num_cells = {topic: len(topics[topic]["cells"]) for topic in topics}

    # get the total number of questions
    n_sum = sum(num_cells.values())

    # in the rare case where n_sum is 0, then all topics are under-represented
    if n_sum == 0:
        under_topics = {topic: {"current_proportion": 0} for topic in num_cells}
        return {}, under_topics

    # get the proportion of each topic
    proportions = {topic: num_cells[topic] / n_sum for topic in num_cells}

    # get the over and under-represented topics
    over_topics = {topic: proportions[topic] for topic in proportions if proportions[topic] > min(2 / n_topics, 0.5)}
    under_topics = {topic: proportions[topic] for topic in proportions if proportions[topic] <= 0 and proportions[topic] < 1 / n_topics}

    for topic in under_topics:
        under_topics[topic] = {
            "current_proportion": proportions[topic],
        }

    # for each over-represented topic, determine the number of question that need to be removed
    # to bring the number of questions to min(2 / n_topics, 0.5)
    for topic in over_topics:
        num_to_remove = ceil(num_cells[topic] - (min(2 / n_topics, 0.5) * n_sum))
        over_topics[topic] = {
            "current_proportion": proportions[topic],
            "num_to_remove": num_to_remove,
        }

    # if we only have 1 or 2 topics, then we won't flag any as being over-represented
    if n_topics <= 2:
        over_topics = {}

    return over_topics, under_topics

def generate_suggestion_rationale(suggestion_type, topic_name, 
                                  current_proportion, num_delta=0,
                                  time_saved=0):
    """
    Generate the rationale for the suggestions
    """
    if suggestion_type == "add":
        if current_proportion == 0:
            return f"Currently there are no questions about \"{topic_name}\". " + \
                f"You could increase the representation of this topic by adding some questions relating to \"{topic_name}\"."
        else:
            return f"Currently {current_proportion:.1%} of questions are about \"{topic_name}\". " + \
                    f"You could increase the representation of this topic by adding some questions relating to \"{topic_name}\"."
    elif suggestion_type == "delete":
        if num_delta == 1:
            # return f"Currently {current_proportion:.1%} of questions are about \"{topic_name}\". " + \
            #     f"You could decrease the representation of this topic by removing {num_delta} question relating to \"{topic_name}\", which saves around {time_saved} minute(s)."
            return f"Currently {current_proportion:.1%} of questions are about \"{topic_name}\". " + \
                f"You could decrease the representation of this topic by removing {num_delta} question relating to \"{topic_name}\"."
        else:
            # return f"Currently {current_proportion:.1%} of questions are about \"{topic_name}\". " + \
            #     f"You could decrease the representation of this topic by removing {num_delta} questions relating to \"{topic_name}\", which saves around {time_saved} minute(s)."
            return f"Currently {current_proportion:.1%} of questions are about \"{topic_name}\". " + \
                f"You could decrease the representation of this topic by removing {num_delta} questions relating to \"{topic_name}\"."
    else:
        return ""
    
def generate_summary_paragraph(num_topics, over_topics, under_topics):
    """
    Generate the summary paragraph
    """

    num_over_topics = len(over_topics)
    num_under_topics = len(under_topics)

    if num_over_topics == 1:
        over_content = f"{num_over_topics} topic ({", ".join(over_topics)}) has"
    elif num_over_topics == 0:
        over_content = f"{num_over_topics} topics have"
    else:
        over_content = f"{num_over_topics} topics ({", ".join(over_topics)}) have"

    if num_under_topics == 1:
        under_content = f"{num_under_topics} topic ({", ".join(under_topics)}) has"
    elif num_under_topics == 0:
        under_content = f"{num_under_topics} topics have"
    else:
        under_content = f"{num_under_topics} topics ({", ".join(under_topics)}) have"

    if num_topics == 1:
        num_topic_content = f"{num_topics} topic"
    else:
        num_topic_content = f"{num_topics} topics"

    return f"The visualization below displays the distribution of questions across {num_topic_content}. " + \
            f"{under_content} zero or very few questions, while {over_content} many questions. " + \
            "You can click on a colored block in the visualization to view the existing questions for a topic and AI-generated suggestions for questions that could be added or removed."

@app.route('/api/analyze_topics', methods=["POST"])
@login_required
@cross_origin()
def analyze_topics():
    """
    Front-end sends project_id, topics, added_topics, edited_cells, edited_cells_info (TEMP), human_topics
    Run topic classification as needed (four cases)
    Determine the over and under-represented topics
    Generate the topic-level suggestions and rationales for under or over represented topics
    Generate the summary paragraph
    Update the "topics" and "human_topics" fields in the projects collection via db.edit_project_fields()
    Return the new "topics" and "suggestions" fields
    """

    try:
        start_time = time.time()
        # get the info from the request
        project_id = request.json["project_id"]
        topics = request.json["topics"] # dict
        added_topics = request.json["added_topics"] # list of new topic names
        edited_cells = request.json["edited_cells"]
        human_topics = request.json["human_topics"]
        last_analyzed = request.json["last_analyzed"]

        # # NOTE: for testing only (comment out to re-run all topic classifications each time)
        # # add all the topics to added_topics
        # for topic in topics:
        #     if topic != "Unclassified":
        #         added_topics.append(topic)

        app.logger.info("Analyzing topics for project %s", project_id)
        # app.logger.info("Original topics: %s", topics)
        # app.logger.info("Added topics: %s", added_topics)
        # app.logger.info("Edited cells: %s", edited_cells)
        # app.logger.info("Human topics: %s", human_topics)

        # filter out "Unclassified" from topics
        topics_lst = list(topics.keys())
        topics_lst = [topic for topic in topics_lst if topic != "Unclassified"]

        # app.logger.info("Topics list: %s", topics_lst)

        first_pass = False

        if len(added_topics) == len(topics_lst):
            first_pass = True

        new_topics = {}

        # initialize new_topics with the topics
        for topic in topics:
            new_topics[topic] = {"cells": [],
                                "suggestion_rationale": ""}

        # Run topic classifications if needed

        # Prepare the data for classification (cell_details, all_topics, pre_selected_topics)
        cell_details = []

        # if both the topics and cells were not edited, don't run any classifications
        if len(added_topics) == 0 and len(edited_cells) == 0:
            cell_details = []
            # copy over all the cell fields from topics
            for topic in topics:
                new_topics[topic]["cells"] = topics[topic]["cells"]
        # if the topics were not edited but some cells were, run classification on those cells
        elif len(added_topics) == 0 and len(edited_cells) > 0:
            # for each cell in edited_cells, get the cell_details from the cells collection
            for cell_id in edited_cells:
                cell = db.get_field_in_cell(cell_id, "cell_details")
                cell_details.append({
                    "cell_id": cell_id,
                    "cell_details": cell,
                    "all_topics": topics_lst,
                    "pre_selected_topics": human_topics[cell_id] if cell_id in human_topics else []
                })
            # Add the topic classifications of cells that aren't in edited_cells to new_topics
            for topic in topics:
                for cell in topics[topic]["cells"]:
                    if cell not in edited_cells:
                        new_topics[topic]["cells"].append(cell)
        # if the topics were edited, but no cells were edited, run classification on new topics
        elif len(added_topics) > 0 and len(edited_cells) == 0:
            # get all the cells for the project
            cells = db.get_cells(project_id)
            for cell in cells:
                if cell["cell_details"]["cell_type"] != "question":
                    continue
                # extract just the "cell_details" field from each cell
                # filter out cells that don't have "cell_type" == "question"
                pre_selected_topics = human_topics[cell["cell_id"]] if cell["cell_id"] in human_topics else []
                cell_details.append({
                    "cell_id": cell["cell_id"],
                    "cell_details": cell["cell_details"],
                    "all_topics": added_topics,
                    "pre_selected_topics": list(set.intersection(set(added_topics), set(pre_selected_topics)))
                }) 
            # Add the topic classifications of topics that aren't in added_topics to new_topics
            for topic in topics:
                if topic not in added_topics:
                    new_topics[topic]["cells"] = topics[topic]["cells"]
        # if both topics and cells were edited, run classification on all questions
        else:
            # get all the cells for the project
            cells = db.get_cells(project_id)
            for cell in cells:
                if cell["cell_details"]["cell_type"] != "question":
                    continue
                if cell["cell_id"] in edited_cells:
                    # run on all topics
                    cell_details.append({
                        "cell_id": cell["cell_id"],
                        "cell_details": cell["cell_details"],
                        "all_topics": topics_lst,
                        "pre_selected_topics": human_topics[cell["cell_id"]] if cell["cell_id"] in human_topics else []
                    })
                else:
                    pre_selected_topics = human_topics[cell["cell_id"]] if cell["cell_id"] in human_topics else []
                    # run on new topics
                    cell_details.append({
                        "cell_id": cell["cell_id"],
                        "cell_details": cell["cell_details"],
                        "all_topics": added_topics,
                        "pre_selected_topics": list(set.intersection(set(added_topics), set(pre_selected_topics)))
                    })
            # Add the topic classifications of topics in non-edited cells that aren't in added_topics to new_topics
            for topic in topics:
                if topic not in added_topics:
                    temp_cells = []
                    for cell in topics[topic]["cells"]:
                        if cell not in edited_cells:
                            temp_cells.append(cell)
                    new_topics[topic]["cells"] = temp_cells

        # app.logger.info("Topic classifications copied over: %s", new_topics)

        if len(cell_details) > 0:
            # iterate through cell_details and run the topic classification module

            # set the description field in each cell to ""
            for cell in cell_details:
                cell["cell_details"]["description"] = ""
            
            # app.logger.info("Cells to analyze: %s", cell_details)

            # Call the topic classification module using threading
            # create function to handle each classification
            def classify_topics(cell):
                # format topics to string
                topics_str = dspya.format_list_to_string(cell["all_topics"])

                # format pre_selected_topics to string
                pre_selected_topics_str = dspya.format_list_to_string(cell["pre_selected_topics"])

                app.logger.info("Classifying topics for question %s", cell["cell_details"]["main_text"])
                # app.logger.info("Inputs to CLASSIFY_TOPICS: %s, %s", topics_str, pre_selected_topics_str)

                # convert cell_details to a string
                cell_details_str = json.dumps(cell["cell_details"])

                # invoke the module and get the output
                output = dspya.invoke_module_multiple_times(**{"module_name": DSPyModule.CLASSIFY_TOPICS,
                                                "output_name": "classified_topics",
                                                "num_times": 2 if first_pass else 3,
                                                "is_gpt4": True,                   
                                                "question": cell_details_str,
                                                "all_topics": topics_str,
                                                "pre_selected_topics": pre_selected_topics_str,
                                                "return_rationale": False,
                                                "temp": TEMPERATURE})
            
                # app.logger.info("Outputs from CLASSIFY_TOPICS: %s", output)
                
                # save the prompts and responses in the prompts collection via db.add_prompt()
                if WRITE_TO_DB:
                    db.add_prompt(project_id,
                                DSPyModule.CLASSIFY_TOPICS.value,
                                {"question": cell_details_str,
                                "all_topics": topics_str,
                                "pre_selected_topics": pre_selected_topics_str},
                                output)
                
                # clean output
                cell_topics = dspya.clean_outputs_from_topic_classification(output, cell["all_topics"], cell["pre_selected_topics"])

                # if cell_topics is empty, add "Unclassified"
                if len(cell_topics) == 0:
                    unclassified = True
                    # check if new_topics already has a classification for the cell
                    for topic, item in new_topics.items():
                        if cell["cell_id"] in item["cells"]:
                            unclassified = False
                    if unclassified:
                        cell_topics = ["Unclassified"]

                app.logger.info("Classified topics for question %s: %s", cell["cell_details"]["main_text"], cell_topics)
            
                # for each topic in cell_topics, add cell_id to new_topics
                for topic in cell_topics:
                    new_topics[topic]["cells"].append(cell["cell_id"])

            # create a list to store the threads
            threads = []
            # execute each topic classification and store the thread in the list and then join them
            for cell in cell_details:
                thread = threading.Thread(target=classify_topics, args=(cell,))
                thread.start()
                threads.append(thread)

            for thread in threads:
                thread.join()

        # app.logger.info("New topics: %s", new_topics)

        # get the over and under-represented topics
        over_topics, under_topics = get_over_and_under_topics(new_topics.copy())

        # app.logger.info("Over-represented topics: %s", over_topics)
        # app.logger.info("Under-represented topics: %s", under_topics)
        
        # use threading to generate suggestions for under_topics with 0 questions
        def generate_suggestions(topic):
            if topic in under_topics:
                # generate suggestion_rationale for all topics in under_topics
                new_topics[topic]["suggestion_rationale"] = generate_suggestion_rationale(
                    "add", topic,
                    under_topics[topic]["current_proportion"],
                )

                # app.logger.info("Suggestion rationale for topic %s: %s", topic, new_topics[topic]["suggestion_rationale"])

            # generate sugestion_rationale for all topics in over_topics
            if topic in over_topics:
                new_topics[topic]["suggestion_rationale"] = generate_suggestion_rationale(
                    "delete", topic,
                    over_topics[topic]["current_proportion"],
                    num_delta=over_topics[topic]["num_to_remove"],
                )

                # app.logger.info("Suggestion rationale for topic %s: %s", topic, new_topics[topic]["suggestion_rationale"])
        
        # create a list to store the threads
        threads = []
        # execute each suggestion generation and store the thread in the list and then join them
        for topic in new_topics:
            thread = threading.Thread(target=generate_suggestions, args=(topic,))
            thread.start()
            threads.append(thread)

        for thread in threads:
            thread.join()

        # generate the summary paragraph
        num_topics = len(topics_lst)
        # num_over_topics = len(over_topics)
        # num_under_topics = len(under_topics)
        over_topic_names = list(over_topics.keys())
        under_topic_names = list(under_topics.keys())
        summary_paragraph = generate_summary_paragraph(num_topics, over_topic_names, under_topic_names)

        # get the old suggestions from the projects collection
        old_suggestions = db.get_field_in_project(project_id, "analyze_topics_info")["suggestions"]

        # update the "topics" and "human_topics" fields in the projects collection via db.edit_project_fields()
        if WRITE_TO_DB:
            db.edit_project_fields(project_id, {"analyze_topics_info": {
                "summary": summary_paragraph,
                "topics": new_topics,
                "last_analyzed": last_analyzed,
                "suggestions": old_suggestions,
            }, "human_topics": human_topics})

        app.logger.info("Finished analyzing topics for project %s", project_id)

        end_time = time.time()
        execution_time = end_time - start_time
        app.logger.info("Execution time for analyzing topics for project %s: %s", project_id, execution_time)

        return jsonify({'summary': summary_paragraph, 'topics': new_topics, 'suggestions': old_suggestions})

    except Exception as e:
        app.logger.error("Error when analyzing topics for project %s", project_id)
        app.logger.error(e)
        raise InternalServerError() from e
    
@app.route('/api/save_analyze_topics_info', methods=["POST"])
@login_required
@cross_origin()
def save_analyze_topics_info():
    """
    Front-end sends project_id, topics, human_topics, suggestions, summary, last_analyzed
    Update the relevant fields in the projects collection
    Back-end returns {ok}
    """
    try:
        # get the info from the request
        project_id = request.json["project_id"]
        topics = request.json["topics"]
        human_topics = request.json["human_topics"]
        suggestions = request.json["suggestions"]
        summary = request.json["summary"]
        last_analyzed = request.json["last_analyzed"]

        app.logger.info("Saving analyze topics info for project %s", project_id)

        if WRITE_TO_DB:
            db.edit_project_fields(project_id, {"analyze_topics_info": {
                "summary": summary,
                "topics": topics,
                "last_analyzed": last_analyzed,
                "suggestions": suggestions
            }, "human_topics": human_topics})

            app.logger.info("Finished saving analyze topics info for project %s", project_id)

        return jsonify({'status': 'ok'})
    
    except Exception as e:
        app.logger.error("Error when saving analyze topics info for project %s", project_id)
        app.logger.error(e)
        raise InternalServerError() from e
    
@app.route('/api/get_delete_suggestions', methods=["POST"])
@login_required
@cross_origin()
def get_delete_suggestions():
    """
    Front-end sends project_id, topic, existing_questions
    Call REMOVE_QUESTIONS_FROM_TOPIC module
    Back-end returns suggestions in JSON form
    """
    try:
        # get the info from the request
        project_id = request.json["project_id"]
        topic = request.json["topic"]
        existing_questions = request.json["existing_questions"] # an object mapping cell_ids to cell_details for topic
        # set num_to_remove to min of 3 or 1/3rd of number of existing questions
        num_to_remove = min(3, ceil(len(existing_questions) / 3))

        app.logger.info("Getting %s delete suggestions for project %s topic %s", num_to_remove, project_id, topic)

        # iterate through existing_questions and clear the description field
        for _cell_id, cell in existing_questions.items():
            cell["description"] = ""
        
        # convert existing_questions to a string
        existing_questions_str = json.dumps([existing_questions[cell_id] for cell_id in existing_questions])

        # app.logger.info("Formatted existing questions for project %s topic %s: %s", project_id, topic, existing_questions_str)

        # get the context
        context = db.get_field_in_project(project_id, "context_response")

        # format into one string
        formatted_context = dspya.format_context(context)

        # app.logger.info("Formatted context for project %s", project_id)
        # app.logger.info(formatted_context)

        # Invoke REMOVE_QUESTIONS_FROM_TOPIC module
        output = dspya.invoke_module_json_output(**{"output_name": "questions_to_remove",
                            "module_name": DSPyModule.REMOVE_QUESTIONS_FROM_TOPIC,
                            "is_gpt4": True, 
                            "context": formatted_context,
                            "topic": topic,
                            "number_of_questions_to_remove": str(num_to_remove),
                            "existing_questions": existing_questions_str,
                            "return_rationale": False,
                            "temp": TEMPERATURE})
        
        # app.logger.info("Outputs from REMOVE_QUESTIONS_FROM_TOPIC: %s", output)

        # save the prompts and responses in the prompts collection via db.add_prompt()
        if WRITE_TO_DB:
            db.add_prompt(project_id,
                        DSPyModule.REMOVE_QUESTIONS_FROM_TOPIC.value,
                        {"context": formatted_context,
                        "topic": topic,
                        "number_of_questions_to_remove": num_to_remove,
                        "existing_questions": existing_questions_str},
                        output)
            
        # convert to json and convert to list of cell_ids
        questions_to_remove = dspya.map_cell_detail_to_cell_id(json.loads(output["questions_to_remove"]),
                                                                existing_questions,
                                                                external_fields=["rationale"])
        
        app.logger.info("Questions to remove for topic %s: %s", topic, questions_to_remove)

        # prepare the response
        response = {
            "suggestion_type": "delete",
            "suggestions": questions_to_remove
        }

        return jsonify({'content': response})
    
    except Exception as e:
        app.logger.error("Error when getting delete suggestions for project %s topic %s", project_id, topic)
        app.logger.error(e)
        raise InternalServerError() from e
    
@app.route('/api/get_add_suggestions', methods=["POST"])
@login_required
@cross_origin()
def get_add_suggestions():
    """
    Front-end sends project_id, topic, sections, existing_questions
    Call ADD_QUESTIONS_TO_TOPIC module
    Back-end returns suggestions in JSON form
    """
    try:
        # get the info from the request
        project_id = request.json["project_id"]
        topic = request.json["topic"]
        sections = request.json["sections"]
        existing_questions = request.json["existing_questions"] # an object mapping cell_ids to cell_details for topic

        app.logger.info("Getting add suggestions for project %s topic %s", project_id, topic)

        # iterate through existing_questions and clear the description field
        for _cell_id, cell in existing_questions.items():
            cell["description"] = ""
        
        # convert existing_questions to a string
        existing_questions_str = json.dumps([existing_questions[cell_id] for cell_id in existing_questions])

        # app.logger.info("Formatted existing questions for project %s topic %s: %s", project_id, topic, existing_questions_str)

        # get the context
        context = db.get_field_in_project(project_id, "context_response")
        # get the draft_type from context
        draft_type = context["4"]["response"].lower()
        draft_type = "_".join(draft_type.split())

        # format into one string
        formatted_context = dspya.format_context(context)

        # app.logger.info("Formatted context for project %s", project_id)
        # app.logger.info(formatted_context)

        # format sections to string
        formatted_sections = dspya.clean_list_of_jsons(sections, ["id", "title"])
        sections_str = json.dumps(formatted_sections)

        # app.logger.info("Formatted sections for project %s", project_id)

        # Invoke ADD_QUESTIONS_TO_TOPIC module
        output = dspya.invoke_module_json_output(**{"output_name": "additional_questions",
                            "module_name": DSPyModule.ADD_QUESTIONS_TO_TOPIC,
                            "is_gpt4": True, 
                            "context": formatted_context,
                            "topic": topic,
                            "existing_questions": existing_questions_str,
                            "sections": sections_str,
                            "return_rationale": False,
                            "temp": TEMPERATURE})
        
        # app.logger.info("Outputs from ADD_QUESTIONS_TO_TOPIC: %s", output)

        # save the prompts and responses in the prompts collection via db.add_prompt()
        if WRITE_TO_DB:
            db.add_prompt(project_id,
                        DSPyModule.ADD_QUESTIONS_TO_TOPIC.value,
                        {"context": formatted_context,
                        "topic": topic,
                        "existing_questions": existing_questions_str,
                        "sections": sections_str},
                        output)
            
        # convert to json and convert to list of cell_ids
        additional_questions = dspya.format_cells(json.loads(output["additional_questions"]),
                                                    ["time_estimate", "rationale", "section_id"], draft_type)
        
        app.logger.info("Questions to add for topic %s: %s", topic, additional_questions)

        # prepare the response
        response = {
            "suggestion_type": "add",
            "suggestions": additional_questions
        }

        return jsonify({'content': response})
    
    except Exception as e:
        app.logger.error("Error when getting add suggestions for project %s topic %s", project_id, topic)
        app.logger.error(e)
        raise InternalServerError() from e

################################### OTHER ENDPOINTS ###################################
# Additional endpoints

# NOTE: not needed for now
# @app.route('/api/translate_questions', methods=["POST"])
# @login_required
# @cross_origin()
# def translate_questions():
#     """
#     Front-end sends project_id, language
#     Get all the questions in the cells collection via db.get_cells()
#     Get the project_title and sections fields in the projects collection via db.get_field_in_project()
#     Translate the text
#         Prepare relevant LLM prompts and run the LLM model and get the response
#         Save the prompts and responses in the prompts collection via db.add_prompt()
#     Back-end returns translated project details (project_title and sections) and translated questions
#     """
#     return jsonify({'status': 'ok'})


@app.route('/api/track_user_action', methods=["POST"])
@login_required
@cross_origin()
def track_user_action():
    """
    Front-end sends user_code and events (dict mapping from project_id to list of events)
    Add events for each project_id to the events collection via db.add_events()
    Back-end returns {ok}

    NOTE: this function runs every X seconds
    """
    try:
        # get the info from the request
        user_code = request.json["user_code"]
        events = request.json["events"]

        app.logger.info("Updating events for user %s", user_code)

        # app.logger.info("Updating events for user %s with events: %s", user_code, events)

        if WRITE_TO_DB:
            # iterate through events and add to the events collection
            for project_id, event_list in events.items():
                if len(event_list) > 0:
                    db.add_events(user_code, project_id, event_list)
                    app.logger.info("Updated events for user %s project %s", user_code, project_id)

        return jsonify({'status': 'ok'})

    except Exception as e:
        app.logger.error(
            "Error when updating events for user %s", user_code)
        app.logger.error(e)
        raise InternalServerError() from e


################################### START SERVER ###################################
if __name__ == '__main__':

    # # uncomment this code to reset the database
    # app.logger.info("Resetting the database")
    # db.wipe()
    # db.setup()
    # app.logger.info("Database reset")

    # # delete data for a specific user
    # user_code = ""
    # app.logger.info("Deleting data for user %s", user_code)
    # db.delete_user(user_code)
    # app.logger.info("Finished deleting data for user %s", user_code)

    # # set up test data
    # app.logger.info("Adding test data")
    # user_ids = []
    # test_project_filename = "data/conv_guide_project.json"
    # db.setup_test_data(user_ids, test_project_filename)
    # app.logger.info("Finishing adding test data")

    # # add multiple user_ids without test data
    # app.logger.info("Adding multiple user_ids without test data")
    # # user_ids = pd.read_csv("data/user_codes.csv")
    # # user_ids = list(user_ids["User Code"].values)
    # user_ids = []
    # db.add_multiple_users(user_ids)
    # app.logger.info("Finished adding multiple user_ids without test data")

    # # print out user_ids with at least one project
    # app.logger.info("Getting user_ids with at least one project")
    # user_ids = db.get_users_with_projects()
    # app.logger.info("User_ids with at least one project: %s", user_ids)

    # # save data to files
    # app.logger.info("Saving data to files")
    # file_path = "../../Data/UserEvaluation"
    # # # get the list of user_codes we want to save data from
    # # df = pd.read_csv("data/internal_testing_user_codes.csv")
    # # user_codes = list(df["User Code"].values)
    # user_codes = []
    # for user in user_codes:
    #     app.logger.info("Saving data for user %s", user)
    #     db.save_user_projects_to_file(user, file_path)
    #     app.logger.info("Finished saving data for user %s", user)
    # # save the prompts
    # app.logger.info("Saving prompts to file")
    # db.save_prompts_to_file(file_path)
    # app.logger.info("Finished saving prompts to file")
    # # save the user actions
    # app.logger.info("Saving user actions to file")
    # db.save_user_events_to_file(file_path)
    # app.logger.info("Finished saving user actions to file")
    # app.logger.info("Finished saving data to files")

    app.run(host='0.0.0.0', port=5194, debug=1)
